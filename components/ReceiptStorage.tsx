import { View } from "react-native";
import Text from "../app/components/common/AppText";
import {
  uiStyles as ui,
  uiTokens as tokens,
} from "../app/components/common/dashboardStyles";
import type { ReceiptAccess } from "../services/receipts";
export const storageSize = (bytes: number) =>
  bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(2)} GB`
    : bytes >= 1e6
      ? `${(bytes / 1e6).toFixed(1)} MB`
      : `${(bytes / 1000).toFixed(1)} KB`;
export default function ReceiptStorage({ access }: { access: ReceiptAccess }) {
  const used = access.usage.liveBytes + access.usage.reservedBytes;
  const quota = access.limits.maxStorageBytes;
  const percent =
    quota > 0 ? Math.min(100, (used / quota) * 100) : used > 0 ? 100 : 0;
  return (
    <View
      style={{
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: tokens.card,
        borderWidth: 1,
        borderColor: tokens.border,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Receipt storage</Text>
      <Text>
        {access.administratorFamily
          ? "Included access"
          : access.planName || access.plan}{" "}
        · shared by your family
      </Text>
      <Text>
        {storageSize(used)} used / {storageSize(quota)}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Family receipt storage used"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: tokens.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 10,
            width: `${percent}%`,
            backgroundColor: percent >= 80 ? "#B45309" : tokens.pressed,
          }}
        />
      </View>
      <Text>
        {storageSize(Math.max(0, quota - used))} remaining ·{" "}
        {access.usage.receiptCount} receipts
      </Text>
      {access.usage.reservedBytes > 0 && (
        <Text style={ui.helper}>
          Space is still reserved for uploads or files being removed.
        </Text>
      )}
      {quota > 0 && percent >= 80 && (
        <Text accessibilityLiveRegion="polite" style={{ color: "#9A3412" }}>
          {used >= quota
            ? "Storage allowance reached. Free space or upgrade to add more receipts."
            : "Your family has used at least 80% of its receipt storage."}
        </Text>
      )}
      {access.downgradeDownloadUntil && (
        <Text>
          Plan reduced. Review and download extra receipts by{" "}
          {new Date(access.downgradeDownloadUntil).toLocaleDateString()}. Choose
          which originals to keep. New uploads remain blocked until the family
          upgrades.
        </Text>
      )}
    </View>
  );
}
