import type { SubscriptionOverview } from "./subscriptions";
export type StoreChoice = {
  key: string;
  plan: string;
  interval: string;
  price: string;
  trial: boolean;
};
export type StoreSession = {
  choices: StoreChoice[];
  purchase: (key: string) => Promise<void>;
  restore: () => Promise<void>;
  manage: () => Promise<void>;
  close: () => void;
};
export async function openStoreSession(
  _overview: SubscriptionOverview,
  _onVerified: () => void,
  _onMessage: (message: string) => void,
): Promise<StoreSession> {
  throw new Error(
    "Store purchases are available in the Android or iPhone app after billing setup. This website does not take payment.",
  );
}
