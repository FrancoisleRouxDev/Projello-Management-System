import { useEffect, useState } from "react";
import { createSignalRClient } from "../services/signalrClient";
import { message as antdMessage, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";


import ringtoneSrc from "../../../assets/notifcations/mixkit-waiting-ringtone-1354.wav";

const ringtone = new Audio(ringtoneSrc);
ringtone.loop = true;

type IncomingCallPayload = {
  projectId: string;
  callerUserId: string;
  callerName: string;
};

const callNotificationClient = createSignalRClient<{
  IncomingProjectCall: [string, string, string];
}>({
  hubUrl: `${API_BASE_URL}/callhub`,
  getAccessToken: () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
  },
});

export function useIncomingCallNotifications() {
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await callNotificationClient.start();

        unsubscribe = callNotificationClient.on("IncomingProjectCall", (projectId, callerUserId, callerName) => {
          setIncomingCall({ projectId, callerUserId, callerName });

          // Play ringtone
          ringtone.currentTime = 0;
          ringtone.play().catch(console.error);

          Modal.confirm({
            title: "Incoming Call",
            content: `${callerName} is calling you`,
            okText: "Accept",
            cancelText: "Decline",
            onOk: () => {
              ringtone.pause();
              ringtone.currentTime = 0;

              const callData = { projectId, callerUserId, callerName };
              setIncomingCall(null);

              navigate(`/single-view/${projectId}`);

              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("open-project-call", {
                  detail: { projectId: callData.projectId,autoJoin: true }
                }));
              }, 400);
            },
            onCancel: () => {
              ringtone.pause();
              ringtone.currentTime = 0;
              setIncomingCall(null);
            },
          });
        });
      } catch (err) {
        console.error("Incoming call listener failed:", err);
      }
    };

    void start();

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  return { incomingCall };
}