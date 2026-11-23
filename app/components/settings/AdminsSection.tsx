import { View } from "react-native";
import Text from "../common/AppText";
import type { FamilyAdmin } from "../../../services/families";
import { uiStyles as s, uiTokens as t } from "../common/dashboardStyles";
export default function AdminsSection({
  admins,
  loading,
}: {
  admins: FamilyAdmin[];
  loading: boolean;
}) {
  const label = (admin: FamilyAdmin) =>
    admin.name ||
    (admin.email && !admin.email.endsWith("@privaterelay.appleid.com")
      ? admin.email
      : "Administrator");
  return (
    <View style={s.card}>
      <Text style={s.heading}>Family administrators</Text>
      {loading ? (
        <View
          accessibilityLabel="Loading administrators"
          accessibilityState={{ busy: true }}
          style={{ height: 48, borderRadius: 8, backgroundColor: t.border }}
        />
      ) : admins.length ? (
        admins.map((admin) => (
          <View key={admin.userId} style={s.row}>
            <View style={[s.iconTile, { borderRadius: 22 }]}>
              <Text style={[s.badgeText, { fontSize: 16 }]}>
                {label(admin)
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => Array.from(part)[0])
                  .join("")
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name}>{label(admin)}</Text>
            </View>
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={s.badge}>
                <Text style={s.badgeText}>Admin</Text>
              </View>
              {admin.isCurrentUser && <Text style={s.helper}>You</Text>}
            </View>
          </View>
        ))
      ) : (
        <Text style={s.helper}>No active administrators found.</Text>
      )}
    </View>
  );
}
