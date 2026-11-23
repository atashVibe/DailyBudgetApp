import { useCallback, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Text from "../components/common/AppText";
import { useFocusEffect, useRouter } from "expo-router";
import {
  getSubscriptionOverview,
  subscriptionRequest,
  type SubscriptionOverview,
} from "../../services/subscriptions";
import {
  openStoreSession,
  type StoreSession,
} from "../../services/storeBilling";
import ReceiptStorage, { storageSize } from "../../components/ReceiptStorage";
import AppScreen from "../components/common/AppScreen";
import PrimaryButton from "../components/common/PrimaryButton";

export default function PremiumScreen() {
  const router = useRouter();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null),
    [message, setMessage] = useState(""),
    [interval, setInterval] = useState("monthly"),
    [working, setWorking] = useState(false),
    [ready, setReady] = useState(false);
  const session = useRef<StoreSession | null>(null),
    lock = useRef(false);
  const refresh = useCallback(
    async () => setOverview(await getSubscriptionOverview()),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setReady(false);
      setMessage("");
      void getSubscriptionOverview()
        .then(async (next) => {
          if (!active) return;
          setOverview(next);
          const store = Platform.OS === "android" ? "google" : "apple";
          if (
            Platform.OS === "web" ||
            !next.isFamilyAdmin ||
            !next.availability[store] ||
            (next.currentStore && next.currentStore !== store) ||
            (!next.isPayer && next.currentStore)
          )
            return;
          const connected = await openStoreSession(
            next,
            () => {
              if (active)
                void refresh().catch(() =>
                  setMessage(
                    "Refresh your plan to check the latest store status.",
                  ),
                );
            },
            (text) => {
              if (active) setMessage(text);
            },
          );
          if (!active) {
            connected.close();
            return;
          }
          session.current = connected;
          setReady(true);
        })
        .catch((error) => {
          if (active)
            setMessage(
              error.message ||
                "Your family plan could not be loaded. Return to receipts and retry.",
            );
        });
      return () => {
        active = false;
        session.current?.close();
        session.current = null;
      };
    }, [refresh]),
  );
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The store action did not complete.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const access = overview?.access;
  const unavailable =
    !overview ||
    (!overview.availability.google && !overview.availability.apple);
  return (
    <AppScreen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Family Premium</Text>
        <Text>
          One family subscription shares receipt storage with every current
          family member. Only a family administrator can buy or change the plan.
        </Text>
        {access && (
          <>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              Family: {access.familyName}
            </Text>
            <Text>
              Current plan: {access.planName || access.plan} ·{" "}
              {access.subscriptionStatus || "none"}
              {access.trial ? " · Free trial" : ""}
            </Text>
            {access.paidThrough && (
              <Text>
                {access.willRenew ? "Renews" : "Access ends"}:{" "}
                {new Date(access.paidThrough).toLocaleDateString()}
              </Text>
            )}
            {access.administratorFamily && (
              <Text>
                Receipt uploads are already included through separately granted
                administrator access.
              </Text>
            )}
            <ReceiptStorage access={access} />
            {access.downgradeUploadBlocked && (
              <PrimaryButton
                title="Review receipts after downgrade"
                onPress={() => router.push("/(drawer)/receipt-storage")}
              />
            )}
          </>
        )}
        {overview && !overview.isFamilyAdmin && (
          <Text>Ask your family administrator to manage Premium.</Text>
        )}
        {overview?.currentStore && !overview.isPayer && (
          <Text>
            The original purchaser manages billing in{" "}
            {overview.currentStore === "google"
              ? "Google Play"
              : "Apple App Store"}
            . Ask that person before changing plans.
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {["monthly", "yearly"].map((period) => (
            <View key={period} style={{ flex: 1 }}>
              <PrimaryButton
                title={`${interval === period ? "✓ " : ""}${period === "monthly" ? "Monthly" : "Yearly"}`}
                disabled={working}
                onPress={() => setInterval(period)}
              />
            </View>
          ))}
        </View>
        <Text>
          Yearly price proposals include{" "}
          {((overview?.catalog.yearlyDiscountBps || 1500) / 100).toFixed(0)}%
          off. The app store confirms your actual local price, renewal terms and
          taxes before you approve payment.
        </Text>
        {overview?.catalog.plans.map((plan) => {
          const offer = session.current?.choices.find(
            (choice) => choice.plan === plan.id && choice.interval === interval,
          );
          return (
            <View
              key={plan.id}
              style={{
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#C5DCD6",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700" }}>
                {plan.name}
              </Text>
              <Text>
                {storageSize(plan.storageBytes)} per family
                {plan.maxFileBytes > 0
                  ? " · 10 MB per file"
                  : " · No new receipt uploads"}
              </Text>
              <Text>
                {offer
                  ? `${offer.price} / ${interval === "monthly" ? "month" : "year"}`
                  : `Proposed: $${((interval === "monthly" ? plan.monthlyCents : plan.yearlyCents) / 100).toFixed(2)} USD / ${interval === "monthly" ? "month" : "year"}`}
              </Text>
              {plan.trialMonths > 0 && (
                <Text>
                  Eligible new Premium subscribers can receive one month free. A
                  payment method is required by the store. It renews at the
                  confirmed price unless cancelled before the trial ends; the
                  store confirms eligibility.
                </Text>
              )}
              {plan.id !== "free" && (
                <PrimaryButton
                  title={`Choose ${plan.name}`}
                  disabled={
                    working ||
                    !ready ||
                    !offer ||
                    !overview.isFamilyAdmin ||
                    (access?.plan === plan.id &&
                      access.interval === interval &&
                      access.active)
                  }
                  onPress={() =>
                    void run(async () => {
                      if (offer) await session.current?.purchase(offer.key);
                    })
                  }
                />
              )}
            </View>
          );
        })}
        {unavailable ? (
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#E6FAF5",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              Purchasing is not available yet
            </Text>
            <Text>
              Google Play and Apple billing configuration and real store testing
              are required. Selecting a plan does not activate paid access or
              take payment.
            </Text>
            <PrimaryButton
              title="Purchases coming soon"
              disabled
              onPress={() => {}}
            />
          </View>
        ) : Platform.OS === "web" ? (
          <Text>
            Purchase and manage your subscription through the Android or iPhone
            app. This website does not take payment.
          </Text>
        ) : null}
        {ready && (
          <>
            <PrimaryButton
              title="Restore store purchases"
              disabled={working}
              onPress={() =>
                void run(async () => {
                  await session.current?.restore();
                })
              }
            />
            {overview?.currentStore && (
              <PrimaryButton
                title="Manage, change or cancel in the app store"
                disabled={working}
                onPress={() =>
                  void run(async () => {
                    await session.current?.manage();
                  })
                }
              />
            )}
          </>
        )}
        <PrimaryButton
          title="Refresh subscription"
          disabled={working}
          onPress={() =>
            void run(async () =>
              setOverview(
                await subscriptionRequest<SubscriptionOverview>("/refresh", {}),
              ),
            )
          }
        />
        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          Cancellation and downgrades
        </Text>
        <Text>
          Cancel in the original app store. Paid access continues through the
          paid period. When it ends, uploads stop and current members have a
          30-day grace period to view, download and export receipts before
          scheduled cleanup. Budget entries remain. Files already deleted cannot
          be restored by renewing.
        </Text>
        <Text>
          Store plan changes take effect according to its billing rules. After a
          downgrade takes effect, you have one month to review and download
          extras. Choose whether to keep newer or older receipts that fit the
          smaller plan, then confirm removal of the extras. New uploads stay
          blocked until you upgrade again.
        </Text>
        {access?.deletionScheduledAt && (
          <Text style={{ color: "#9A3412" }}>
            Receipt deletion deadline:{" "}
            {new Date(access.deletionScheduledAt).toLocaleString()}
          </Text>
        )}
        {message ? (
          <Text accessibilityLiveRegion="polite" style={{ color: "#9A3412" }}>
            {message}
          </Text>
        ) : null}
        <PrimaryButton
          title="Back to family receipts"
          onPress={() => router.replace("/(drawer)/receipts")}
        />
      </View>
    </AppScreen>
  );
}
