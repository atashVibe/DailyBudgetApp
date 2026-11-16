import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/auth";
import {
  getReceiptAccess,
  getReceiptAdminStats,
  receiptsConfigured,
  updateReceiptAccess,
} from "../../services/receipts";
import ReceiptPanel from "../../components/ReceiptPanel";
import AppScreen from "../components/common/AppScreen";
import AppTextInput from "../components/common/AppTextInput";
import PrimaryButton from "../components/common/PrimaryButton";

type Stats = {
  receiptCount: number;
  liveBytes: number;
  totalStoredBytes: number;
  retainedOrPendingBytes: number;
  counts: {
    premium: number;
    archive: number;
    administrator: number;
    awaitingDeletion: number;
  };
  deadlines: { familyId: string; deletionScheduledAt: number }[];
  failedDeletions: { operationId: string; result: string; createdAt: number }[];
  estimatedStorageUSD: number | null;
  estimateNotice: string;
};

export default function ReceiptsScreen() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [administrator, setAdministrator] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [target, setTarget] = useState("");
  const [familyTarget, setFamilyTarget] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          setUid("");
          setAdministrator(false);
          setStats(null);
          router.replace("/login");
          return;
        }
        setUid(user.uid);
        if (receiptsConfigured)
          getReceiptAccess()
            .then((access) => {
              setAdministrator(access.administrator);
              setFamilyTarget(access.familyId);
            })
            .catch(() => setAdministrator(false));
      }),
    [router],
  );
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((current) => current + 1);
      setStats(null);
      if (receiptsConfigured && auth.currentUser)
        getReceiptAccess()
          .then((access) => {
            setAdministrator(access.administrator);
            setFamilyTarget(access.familyId);
          })
          .catch(() => setAdministrator(false));
    }, []),
  );
  const adminAction = async (action?: string) => {
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      if (action) {
        await updateReceiptAccess(
          action.endsWith("admin") ? target.trim() : familyTarget.trim(),
          action,
        );
        setMessage("Receipt access updated. No payment was taken.");
      }
      setStats(await getReceiptAdminStats());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load receipt administration.",
      );
    } finally {
      setWorking(false);
    }
  };
  return (
    <AppScreen>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 16 }}>
        Family Receipts
      </Text>
      <ReceiptPanel key={`${uid}-${refreshKey}`} />
      {(administrator || !receiptsConfigured) && (
        <>
          <Text style={{ marginTop: 24, color: "#4B5563" }}>
            Account ID (for receipt setup)
          </Text>
          <Text selectable style={{ paddingVertical: 12 }}>
            {uid}
          </Text>
        </>
      )}
      {administrator && (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Text style={{ fontSize: 23, fontWeight: "600" }}>
            Receipt Administration
          </Text>
          <PrimaryButton
            title="Refresh storage overview"
            onPress={() => void adminAction()}
            disabled={working}
          />
          {stats && (
            <>
              <Text>Receipt records: {stats.receiptCount}</Text>
              <Text>
                Stored originals: {(stats.liveBytes / 1024 / 1024).toFixed(2)}{" "}
                MB
              </Text>
              <Text>
                Total receipt storage, including retained copies:{" "}
                {(stats.totalStoredBytes / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text>
                Pending cleanup / retained copies:{" "}
                {(stats.retainedOrPendingBytes / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text>
                Premium families: {stats.counts.premium} · Archive families:{" "}
                {stats.counts.archive} · Administrators:{" "}
                {stats.counts.administrator}
              </Text>
              <Text>
                Families awaiting deletion: {stats.counts.awaitingDeletion}
              </Text>
              <Text>
                Estimated storage/month:{" "}
                {stats.estimatedStorageUSD === null
                  ? "not available until regional pricing is verified"
                  : `$${stats.estimatedStorageUSD.toFixed(4)} USD`}
              </Text>
              <Text style={{ lineHeight: 22 }}>{stats.estimateNotice}</Text>
              {stats.deadlines.map((row) => (
                <Text key={row.familyId}>
                  {row.familyId}: scheduled for{" "}
                  {new Date(row.deletionScheduledAt).toLocaleString()}
                </Text>
              ))}
              <Text>
                Recent deletion failures: {stats.failedDeletions.length}
              </Text>
              {stats.failedDeletions.map((row, index) => (
                <Text key={`${row.operationId}-${index}`}>
                  {row.operationId}: {row.result}
                </Text>
              ))}
            </>
          )}
          <Text style={{ fontSize: 20, fontWeight: "600", marginTop: 16 }}>
            Manage receipt access
          </Text>
          <Text>
            Use an existing account ID. These actions do not take payment or
            change family-budget roles.
          </Text>
          <AppTextInput
            accessibilityLabel="Target account ID"
            placeholder="Account ID"
            value={target}
            onChangeText={setTarget}
            autoCapitalize="none"
          />
          <PrimaryButton
            title="Grant receipt administrator access"
            onPress={() => void adminAction("grant-admin")}
            disabled={working || !target.trim()}
          />
          <PrimaryButton
            title="Revoke receipt administrator access"
            onPress={() => void adminAction("revoke-admin")}
            disabled={working || !target.trim()}
          />
          <Text>Family plan (shared by all current members)</Text>
          <AppTextInput
            accessibilityLabel="Target family ID"
            placeholder="Family ID"
            value={familyTarget}
            onChangeText={setFamilyTarget}
            autoCapitalize="none"
          />
          <PrimaryButton
            title="Activate family Premium access"
            onPress={() => void adminAction("activate-premium")}
            disabled={working || !familyTarget.trim()}
          />
          <PrimaryButton
            title="Activate family Archive access"
            onPress={() => void adminAction("activate-archive")}
            disabled={working || !familyTarget.trim()}
          />
          <PrimaryButton
            title="Cancel plan and start 30-day grace"
            onPress={() => void adminAction("cancel")}
            disabled={working || !familyTarget.trim()}
          />
          {message ? (
            <Text accessibilityLiveRegion="polite">{message}</Text>
          ) : null}
        </View>
      )}
    </AppScreen>
  );
}
