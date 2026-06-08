import { useEffect } from "react";
import { message as antdMessage } from "antd";
import { createSignalRClient } from "../services/signalrClient";
import { API_BASE_URL } from "../../../config";

type TeamJoinedNotification = {
  projectId: number;
  projectName: string;
  memberName: string;
  assignedAs: string;
  message: string;
};

const teamNotificationClient = createSignalRClient<{
  WorkerJoinedProject: [TeamJoinedNotification];
}>({
   hubUrl: `${API_BASE_URL}/teamNotificationHub`,
  getAccessToken: () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
  },
});

export function useTeamNotifications() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        await teamNotificationClient.start();

        unsubscribe = teamNotificationClient.on("WorkerJoinedProject", (payload) => {
          antdMessage.success(payload.message || `${payload.memberName} joined ${payload.projectName}.`);
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Team notification hub failed:", err);
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}