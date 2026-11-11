import { useEffect, useState } from "react";
import { createSignalRClient } from "../services/signalrClient";
import { message as antdMessage, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../../config";


import ringtoneSrc from "../../../assets/notifcations/mixkit-waiting-ringtone-1354.wav";

const ringtone = new Audio(ringtoneSrc);
ringtone.loop = true;
const INCOMING_CALL_TIMEOUT_MS = 30_000;

const stopRingtone = () => {
  ringtone.pause();
  ringtone.currentTime = 0;
};

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
    let unansweredTimeout: ReturnType<typeof setTimeout> | undefined;
    let activeModal: { destroy: () => void } | undefined;

    const clearIncomingCall = () => {
      if (unansweredTimeout) {
        clearTimeout(unansweredTimeout);
        unansweredTimeout = undefined;
      }
      stopRingtone();
      activeModal?.destroy();
      activeModal = undefined;
      setIncomingCall(null);
    };

    const start = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await callNotificationClient.start();

        unsubscribe = callNotificationClient.on("IncomingProjectCall", (projectId, callerUserId, callerName) => {
          clearIncomingCall();
          setIncomingCall({ projectId, callerUserId, callerName });

          // Play ringtone
          stopRingtone();
          ringtone.play().catch(console.error);

          activeModal = Modal.confirm({
            title: "Incoming Call",
            content: `${callerName} is calling you`,
            okText: "Accept",
            cancelText: "Decline",
            onOk: () => {
              clearIncomingCall();

              const callData = { projectId, callerUserId, callerName };

              navigate(`/single-view/${projectId}`);

              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("open-project-call", {
                  detail: { projectId: callData.projectId,autoJoin: true }
                }));
              }, 400);
            },
            onCancel: () => {
              clearIncomingCall();
            },
          });

          unansweredTimeout = setTimeout(clearIncomingCall, INCOMING_CALL_TIMEOUT_MS);
        });
      } catch (err) {
        console.error("Incoming call listener failed:", err);
      }
    };

    void start();

    return () => {
      unsubscribe?.();
      clearIncomingCall();
    };
  }, [navigate]);

  return { incomingCall };
}