import { useEffect, useState } from "react";
import { createSignalRClient } from "../services/signalrClient";
import { message as antdMessage, Modal } from "antd";
import { API_BASE_URL } from "../../../config";

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
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await callNotificationClient.start();

        unsubscribe = callNotificationClient.on("IncomingProjectCall", (projectId, callerUserId, callerName) => {
          setIncomingCall({ projectId, callerUserId, callerName });

          Modal.confirm({
            title: "Incoming Call",
            content: `${callerName} is calling you`,
            okText: "Accept",
            cancelText: "Decline",
            onOk: () => {
              setIncomingCall(null);
              antdMessage.success(`Joining call with ${callerName}...`);
              // Later you can trigger opening CallOverlay here
            },
            onCancel: () => {
              setIncomingCall(null);
            },
          });
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Incoming call listener failed:", err);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { incomingCall };
}