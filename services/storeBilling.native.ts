import { Platform } from "react-native";
import * as IAP from "expo-iap";
import { auth } from "./auth";
import {
  subscriptionRequest,
  type SubscriptionOverview,
} from "./subscriptions";
import type { StoreChoice, StoreSession } from "./storeBilling";

export async function openStoreSession(
  overview: SubscriptionOverview,
  onVerified: () => void,
  onMessage: (message: string) => void,
): Promise<StoreSession> {
  const store = Platform.OS === "android" ? "google" : "apple";
  if (!overview.availability[store])
    throw new Error("Store purchases are not configured yet.");
  const uid = auth.currentUser?.uid,
    familyId = overview.access.familyId;
  let closed = false;
  const pending = new Set<string>();
  const check = () => {
    if (closed || !uid || auth.currentUser?.uid !== uid)
      throw new Error("Your account changed. Reopen the family plan page.");
  };
  if (!(await IAP.initConnection()))
    throw new Error(
      "The app store could not be opened. Use a store-installed build and retry.",
    );
  const updated = IAP.purchaseUpdatedListener(async (purchase) => {
    if (pending.has(purchase.id) || closed) return;
    pending.add(purchase.id);
    try {
      check();
      if (purchase.purchaseState !== "purchased") {
        onMessage(
          "Your purchase is waiting for store approval. Access will update only after verification.",
        );
        return;
      }
      const result = await subscriptionRequest<{
        verified: boolean;
        familyId: string;
      }>(
        "/verify",
        store === "google"
          ? { store, token: purchase.purchaseToken }
          : {
              store,
              transactionId: purchase.transactionId || purchase.id,
              sandbox: overview.sandboxTesting === true,
            },
      );
      check();
      if (!result.verified || result.familyId !== familyId)
        throw new Error(
          "This purchase belongs to another family. Contact support before buying again.",
        );
      await IAP.finishTransaction({ purchase, isConsumable: false });
      onMessage("Your store purchase has been verified for this family.");
      onVerified();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "Purchase verification failed. Retry verification; do not buy again.",
      );
    } finally {
      pending.delete(purchase.id);
    }
  });
  const failed = IAP.purchaseErrorListener((error) =>
    onMessage(error.message || "The store purchase did not complete."),
  );
  const close = () => {
    closed = true;
    updated.remove();
    failed.remove();
    void IAP.endConnection();
  };
  try {
    const mapping = overview.products.filter((p) => p.store === store);
    const products =
      (await IAP.fetchProducts({
        skus: [...new Set(mapping.map((p) => p.productId))],
        type: "subs",
      })) || [];
    const items: Array<{
      choice: StoreChoice;
      mapping: (typeof mapping)[number];
      offerToken?: string;
    }> = [];
    for (const m of mapping) {
      const product = products.find(
        (p) => p.id === m.productId && p.type === "subs",
      );
      if (!product) continue;
      let price = product.displayPrice,
        trial = false,
        offerToken: string | undefined;
      if (product.platform === "android" && "subscriptionOffers" in product) {
        const offers =
          product.subscriptionOffers?.filter(
            (o) => o.basePlanIdAndroid === m.basePlanId,
          ) || [];
        const offer =
          offers.find(
            (o) =>
              m.plan === "premium" && m.trialOfferId && o.id === m.trialOfferId,
          ) || offers.find((o) => !o.id);
        if (!offer?.offerTokenAndroid) continue;
        offerToken = offer.offerTokenAndroid;
        price = offer.displayPrice;
        trial = m.plan === "premium" && offer.price === 0;
        const phases = offer.pricingPhasesAndroid?.pricingPhaseList;
        if (phases?.length) price = phases[phases.length - 1].formattedPrice;
      } else if (
        product.platform === "ios" &&
        "introductoryPricePaymentModeIOS" in product
      ) {
        trial =
          m.plan === "premium" &&
          product.introductoryPricePaymentModeIOS === "free-trial";
      }
      items.push({
        choice: {
          key: `${m.productId}:${m.basePlanId || ""}`,
          plan: m.plan,
          interval: m.interval,
          price,
          trial,
        },
        mapping: m,
        offerToken,
      });
    }
    return {
      choices: items.map((i) => i.choice),
      close,
      purchase: async (key) => {
        check();
        const item = items.find((i) => i.choice.key === key);
        if (!item)
          throw new Error("This product is not available in the store.");
        const binding = await subscriptionRequest<{
          bindingId: string;
          familyId: string;
        }>("/prepare", { store });
        check();
        if (binding.familyId !== familyId)
          throw new Error("Your active family changed. Reopen this page.");
        let replacement:
            | IAP.SubscriptionProductReplacementParamsAndroid
            | undefined,
          oldToken: string | undefined;
        if (
          store === "google" &&
          overview.access.active &&
          overview.currentProduct
        ) {
          const owned = await IAP.getAvailablePurchases();
          check();
          const old = owned.find(
            (p) =>
              p.productId === overview.currentProduct &&
              p.purchaseToken &&
              "obfuscatedAccountIdAndroid" in p &&
              p.obfuscatedAccountIdAndroid === binding.bindingId,
          );
          if (!old?.purchaseToken)
            throw new Error(
              "Use the Google Play account that pays for this family's subscription.",
            );
          oldToken = old.purchaseToken;
          const current =
            overview.catalog.plans.find((p) => p.id === overview.access.plan)
              ?.storageBytes || 0;
          const next =
            overview.catalog.plans.find((p) => p.id === item.mapping.plan)
              ?.storageBytes || 0;
          replacement = {
            oldProductId: old.productId,
            replacementMode:
              next < current ? "deferred" : "with-time-proration",
          };
        }
        check();
        await IAP.requestPurchase({
          type: "subs",
          request:
            store === "google"
              ? {
                  google: {
                    skus: [item.mapping.productId],
                    obfuscatedAccountId: binding.bindingId,
                    subscriptionOffers: [
                      {
                        sku: item.mapping.productId,
                        offerToken: item.offerToken!,
                      },
                    ],
                    purchaseToken: oldToken,
                    subscriptionProductReplacementParams: replacement,
                  },
                }
              : {
                  apple: {
                    sku: item.mapping.productId,
                    appAccountToken: binding.bindingId,
                    andDangerouslyFinishTransactionAutomatically: false,
                  },
                },
        });
      },
      restore: async () => {
        check();
        await subscriptionRequest("/prepare", { store });
        const owned = await IAP.getAvailablePurchases();
        check();
        if (!owned.length)
          throw new Error(
            "No purchases were found for the current store account.",
          );
        for (const purchase of owned) {
          if (mapping.some((p) => p.productId === purchase.productId)) {
            await subscriptionRequest(
              "/verify",
              store === "google"
                ? { store, token: purchase.purchaseToken }
                : {
                    store,
                    transactionId: purchase.transactionId || purchase.id,
                    sandbox: overview.sandboxTesting === true,
                  },
            );
          }
        }
        check();
        onVerified();
        onMessage("Available purchases have been checked by the server.");
      },
      manage: async () => {
        check();
        await IAP.deepLinkToSubscriptions({
          skuAndroid: overview.currentProduct || undefined,
          packageNameAndroid: "com.atashvibe.dailybudget",
        });
      },
    };
  } catch (error) {
    close();
    throw error;
  }
}
