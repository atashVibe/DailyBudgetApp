import { disableNetwork, enableNetwork } from "firebase/firestore";
import { db } from "./auth";
export async function withTimeout<T>(
  work: Promise<T>,
  milliseconds = 15000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Object.assign(
                new Error("The connection is taking too long. Please retry."),
                {
                  code: "app/connection-timeout",
                },
              ),
            ),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

let reconnecting: Promise<void> | undefined;
export function restartCloudConnection() {
  if (!reconnecting)
    reconnecting = (async () => {
      await disableNetwork(db);
      await enableNetwork(db);
    })().finally(() => {
      reconnecting = undefined;
    });
  return reconnecting;
}

// Retry transient read failures with bounded backoff while a mobile connection
// returns. Never replay a financial write, retry permission errors or sign out.
export async function withCloudRetry<T>(read: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 30000;
  const delays = [2000, 4000, 8000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await withTimeout(
        read(),
        Math.min(15000, Math.max(1, deadline - Date.now())),
      );
    } catch (error) {
      const code = (error as { code?: string })?.code || "";
      const retryable =
        /^(app\/connection-timeout|(?:firestore\/)?(?:unavailable|deadline-exceeded|cancelled))$/.test(
          code,
        );
      const delay = delays[attempt];
      if (!retryable || delay === undefined || Date.now() + delay >= deadline)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      await restartCloudConnection();
    }
  }
}
