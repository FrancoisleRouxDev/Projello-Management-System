import json, urllib.request, urllib.error, random, time, base64
BASE="http://localhost:5049"
random.seed(7)

def call(method, path, body=None, token=None):
    req=urllib.request.Request(BASE+path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type","application/json")
    if token: req.add_header("Authorization","Bearer "+token)
    for attempt in range(8):
        try:
            with urllib.request.urlopen(req) as r:
                t=r.read().decode(); return r.status, (json.loads(t) if t else None)
        except urllib.error.HTTPError as e:
            t=e.read().decode()
            if e.code==429:  # auth endpoints allow 10 requests/minute per IP
                time.sleep(10); continue
            return e.code, t

def login(email,pw="Password123!"):
    s,r=call("POST","/api/auth/login",{"email":email,"password":pw}); return r["token"] if s==200 else None

COMPANIES=[
 {"company":"Smoke Co","owner":"Smoke Test","email":"smoke@test.com","clients":None},
 {"company":"Ridgeback Builders","owner":"Thandi Mokoena","email":"thandi@ridgeback.example.com","clients":[
   ("Jacaranda Housing Association","Social housing developments"),
   ("Mokoena Family Trust","Private residential builds"),
   ("Hilltop Medical Group","Clinics and day hospitals"),
   ("Greenline Logistics","Distribution centres")]},
 {"company":"Karoo Civil Works","owner":"Pieter Joubert","email":"pieter@karoo.example.com","clients":[
   ("Beaufort West Municipality","Roads and stormwater"),
   ("Karoo Solar Partners","Solar farm foundations"),
   ("Prince Albert Co-op","Cold storage and sheds"),
   ("Swartberg Lodges","Tourism accommodation")]},
]
PROJECT_NAMES=["Phase 1 Groundworks","Main Building Extension","Roof & Waterproofing","Interior Fit-out","Parking & Paving","Site Office Upgrade","Boundary Wall","Electrical Rewire"]
STATUS_CYCLE=["In Progress","In Progress","Not Started","Completed","In Progress"]
MILESTONES=["Site establishment","Foundations","Structure","Services","Finishes","Handover"]

for c in COMPANIES:
    tok=login(c["email"])
    if not tok:
        s,r=call("POST","/api/auth/register-company",{"companyName":c["company"],"fullName":c["owner"],"email":c["email"],"password":"Password123!"})
        print(c["company"],"register",s); tok=login(c["email"])
    s,existing=call("GET","/api/clients",token=tok)
    by_name={x["name"]:x["clientID"] for x in existing}
    for name,notes in (c["clients"] or []):
        if name not in by_name:
            s,r=call("POST","/api/clients",{"name":name,"contactEmail":"info@"+name.split()[0].lower()+".example.com","contactPhone":"021 555 0"+str(random.randint(100,199)),"notes":notes},tok)
            by_name[name]=r["clientID"]
    s,projects=call("GET","/api/Projects",token=tok)
    have={(p["clientName"] if "clientName" in p else None, p["name"]) for p in projects} if isinstance(projects,list) else set()
    made=0
    have_by_client={}
    for p_ in projects:
        have_by_client[p_.get("clientID")]=have_by_client.get(p_.get("clientID"),0)+1
    for name,cid in by_name.items():
        if have_by_client.get(cid,0)>=2: continue   # already seeded: keeps re-runs idempotent
        for k in range(2-have_by_client.get(cid,0)):
            pname=f"{name.split()[0]} {random.choice(PROJECT_NAMES)}"
            if any(p["name"]==pname for p in projects): continue
            status=random.choice(STATUS_CYCLE)
            start=f"2026-{random.randint(3,9):02d}-{random.randint(1,28):02d}"
            due=f"2027-{random.randint(1,8):02d}-{random.randint(1,28):02d}"
            s,r=call("POST","/api/Projects",{"name":pname,"clientID":cid,"description":f"Fake seed project for {name}.","startDate":start,"dueDate":due},tok)
            if s not in (200,201): print("project fail",s,r); continue
            pid=r["projectID"]; made+=1
            projects.append({"name":pname})
            if status!="Not Started": call("PUT",f"/api/Projects/{pid}/status",{"status":status},tok)
            n={"Not Started":0,"In Progress":random.randint(2,4),"Completed":len(MILESTONES)}[status]
            for i in range(n):
                prog=100 if status=="Completed" or i<n-2 else random.choice([30,60,85])
                call("POST","/api/milestones",{"projectID":pid,"title":MILESTONES[i],"dueDate":due,"progress":prog},tok)
    print(c["company"],"clients",len(by_name),"new projects",made)


# ---------- Workers (invite code -> register -> assign to projects) ----------
WORKERS={
 "smoke@test.com":["Lindiwe Dlamini","Johan Botha","Aisha Patel","Sipho Ndlovu"],
 "thandi@ridgeback.example.com":["Zanele Khumalo","Francois Naude","Megan Adams","Tebogo Mokoena"],
 "pieter@karoo.example.com":["Annelie Visser","Kagiso Molefe","Ruan Coetzee","Nomsa Zulu"],
}
def user_id(token):
    payload=token.split(".")[1]; payload+="="*(-len(payload)%4)
    return json.loads(base64.urlsafe_b64decode(payload))["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]

for owner_email,names in WORKERS.items():
    owner=login(owner_email); domain=owner_email.split("@")[1]
    s_,projects=call("GET","/api/Projects",token=owner)
    pids=[p["projectID"] for p in projects]
    for i,full in enumerate(names):
        email=full.lower().replace(" ",".")+"@"+("test.com" if domain=="test.com" else domain)
        wtoken=login(email)
        if not wtoken:
            s_,inv=call("POST","/api/auth/generate-invite",token=owner)
            s_,r=call("POST","/api/auth/register",{"fullName":full,"email":email,"password":"Password123!","inviteCode":inv["inviteCode"]})
            if s_!=200: print("register fail",email,s_,r); continue
            wtoken=login(email)
        uid=user_id(wtoken)
        for pid in random.sample(pids,min(3,len(pids))):
            call("POST",f"/api/Projects/{pid}/members",{"userID":uid,"assignedAs":"Foreman" if i==0 else "Worker"},owner)
    print(owner_email,"workers",len(names))
