
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SideNavBar.css";
import BearLogo from "../assets/Logo/Navbar_Logo.svg";
import UserDefaultPfp from "../assets/UserDefaultPfp.svg";
import { createAvatar } from '@dicebear/core';
import { botttsNeutral } from '@dicebear/collection';



function getUserInfoFromToken() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return { id: "", name: "Unknown", role: "Unknown" };
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(token.split('.')[1].length + (4 - token.split('.')[1].length % 4) % 4, '=')));
        const id = payload.sub || payload.nameid || payload.id || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "";
        const name = payload.FullName || payload.fullName || payload.name || payload.email || "Unknown";
        let role = payload.role || payload.Role || payload.roleName || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        if (!role && payload.RoleID) {
            switch (payload.RoleID.toString()) {
                case "1": role = "Admin"; break;
                case "2": role = "Foreman"; break;
                case "3": role = "Worker"; break;
                default: role = `Role ${payload.RoleID}`;
            }
        }
        if (!role) role = "Unknown";
        return { id, name, role };
    } catch {
        return { id: "", name: "Unknown", role: "Unknown" };
    }
}


export default function SideNavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: userId, name, role } = getUserInfoFromToken();
    const [avatarSeed, setAvatarSeed] = useState("");
    const [avatarBg, setAvatarBg] = useState("");

    // Always fetch avatarSeed and avatarBackground from backend on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`http://localhost:5049/api/users/${userId}/full`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.avatarSeed) setAvatarSeed(data.avatarSeed);
                    if (data.avatarBackground) setAvatarBg(data.avatarBackground);
                }
            } catch (e) {
                // ignore
            }
        };
        fetchProfile();
    }, [userId]);

    // Local DiceBear SVG generation (no network request)
    const hasCustomAvatar = avatarSeed && avatarBg;
    // Use the user's avatarBg value, fallback to a default if missing (match settings page logic)
    const bg = avatarBg && avatarBg.trim() !== "" ? avatarBg : "ffa000";
    const avatarSvg = hasCustomAvatar
        ? createAvatar(botttsNeutral, { seed: avatarSeed, backgroundColor: bg.startsWith('#') ? bg : `#${bg}` }).toString()
        : null;

    return (
        <div className="side-nav-wrapper">
            <div className="side-nav-main">
                <div style={{ height: "100px" }} />
                <div className="pageNavContainer">
                    <div className="side-nav-logo-container">
                        <img src={BearLogo} alt="Projello Logo" className="side-nav-logo" />
                    </div>
                    <a
                        className={`pageNavLink${location.pathname === "/dashboard" ? " active" : ""}`}
                        onClick={() => navigate("/dashboard")}
                    >
                        <h5>Jello Jobs</h5>
                    </a>
                    <a
                        className={`pageNavLink${location.pathname === "/history" ? " active" : ""}`}
                        onClick={() => navigate("/history")}
                    >
                        <h5>History</h5>
                    </a>
                    <a
                        className={`pageNavLink${location.pathname === "/management" ? " active" : ""}`}
                        onClick={() => navigate("/management")}
                    >
                        <h5>Management</h5>
                    </a>
                </div>
            </div>
            <div className="side-nav-footer">
                <div
                    className={`userInfo${location.pathname === "/settings" ? " active" : ""}`}
                    onClick={() => navigate("/settings")}
                    tabIndex={0}
                    role="button"
                    style={{ cursor: "pointer" }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") navigate("/settings"); }}
                >
                    <div className="ProfilePic">
                        {hasCustomAvatar ? (
                            <img
                                src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`}
                                alt="User Avatar"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "block",
                                    background: bg.startsWith('#') ? bg : `#${bg}`
                                }}
                            />
                        ) : (
                            <span style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                display: "block",
                                background: "#C5D3C9",
                                overflow: "hidden"
                            }}>
                                <img
                                    src={UserDefaultPfp}
                                    alt="Default User Avatar"
                                    style={{ width: 36, height: 36, borderRadius: "50%", display: "block", background: "transparent" }}
                                />
                            </span>
                        )}
                    </div>
                    <div className="UserDetails">
                        <h5>{name}</h5>
                        <p>{role}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
