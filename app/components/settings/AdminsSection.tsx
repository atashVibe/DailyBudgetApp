import { StyleSheet, Text, View } from "react-native";
import type { FamilyAdmin } from "../../../services/families";

type Props = {
  admins: FamilyAdmin[];
  loading: boolean;
};

export default function AdminsSection({ admins, loading }: Props) {
  const visibleAdminLabel = (admin: FamilyAdmin) => {
    if (admin.name) return admin.name;
    if (
      admin.email &&
      !admin.email.toLowerCase().endsWith("@privaterelay.appleid.com")
    ) {
      return admin.email;
    }
    return "Administrator name not set";
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Family Administrators</Text>
      <Text style={styles.help}>
        Administrators can manage the family budget, categories, invitations,
        and family membership.
      </Text>

      {loading ? (
        <Text style={styles.muted}>Loading administrators...</Text>
      ) : admins.length === 0 ? (
        <Text style={styles.muted}>No active administrators found.</Text>
      ) : (
        admins.map((admin) => (
          <View key={admin.userId} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>A</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.email}>
                {visibleAdminLabel(admin)}
              </Text>
              <Text style={styles.role}>
                Administrator{admin.isCurrentUser ? " • You" : ""}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 24,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  help: { color: "#64748B", lineHeight: 20, marginBottom: 14 },
  muted: { color: "#64748B", paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E6FAF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  badgeText: { color: "#087F65", fontWeight: "800", fontSize: 16 },
  details: { flex: 1 },
  email: { color: "#111827", fontWeight: "600", fontSize: 15 },
  role: { color: "#64748B", fontSize: 13, marginTop: 3 },
});
