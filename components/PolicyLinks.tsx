import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function PolicyLinks() {
  return (
    <View style={styles.links}>
      <Link href="/privacy" style={styles.link}>
        Privacy Policy
      </Link>
      <Link href="/terms" style={styles.link}>
        Terms of Use
      </Link>
      <Link href="/support" style={styles.link}>
        Support
      </Link>
      <Link href="/delete-account" style={styles.link}>
        Account & Data Deletion
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
  },
  link: {
    color: "#155E50",
    textDecorationLine: "underline",
    fontSize: 15,
    padding: 10,
  },
});
