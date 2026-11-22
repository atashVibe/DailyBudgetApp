import { StyleSheet } from "react-native";
export const dashboardStyles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#F8FBFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0EAF5",
    boxShadow: "0px 5px 16px rgba(24,73,124,0.12)",
  },
  title: { fontSize: 21, fontWeight: "800", color: "#0E172B" },
  detail: { fontSize: 12, color: "#40516B", lineHeight: 18 },
  period: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDD9E8",
    backgroundColor: "#FFF",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  progressLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  progressTitle: { fontSize: 13, fontWeight: "700", color: "#14213A" },
});
