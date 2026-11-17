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
              new Error("The connection is taking too long. Please retry."),
            ),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function restartCloudConnection() {
  await disableNetwork(db);
  await enableNetwork(db);
}
