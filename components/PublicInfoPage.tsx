import { Link } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppScreen from "../app/components/common/AppScreen";
import PolicyLinks from "./PolicyLinks";

type Props = {
  title: string;
  introduction: string;
  sections: { title: string; body: string }[];
  dated?: boolean;
  children?: ReactNode;
};

export default function PublicInfoPage({
  title,
  introduction,
  sections,
  dated,
  children,
}: Props) {
  return (
    <AppScreen>
      <View style={styles.content}>
        <Link href="/login" style={styles.back}>
          DailyBudget · Sign in
        </Link>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {dated && (
          <Text style={styles.date}>Last updated: November 14, 2026</Text>
        )}
        <Text selectable style={styles.body}>
          {introduction}
        </Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>
              {section.title}
            </Text>
            <Text selectable style={styles.body}>
              {section.body}
            </Text>
          </View>
        ))}
        {children}
        <View style={styles.contact}>
          <Text style={styles.body}>
            Questions or requests? Contact DailyBudget:
          </Text>
          <Link href="mailto:dailybudgethub@gmail.com" style={styles.email}>
            dailybudgethub@gmail.com
          </Link>
        </View>
        <PolicyLinks />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingVertical: 20,
  },
  back: {
    color: "#155E50",
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  date: { fontSize: 14, color: "#4B5563", marginBottom: 16 },
  section: { marginTop: 24 },
  heading: {
    fontSize: 21,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  body: { fontSize: 16, lineHeight: 25, color: "#374151" },
  contact: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    marginTop: 28,
    paddingTop: 20,
  },
  email: {
    color: "#155E50",
    textDecorationLine: "underline",
    fontSize: 16,
    paddingVertical: 12,
  },
});
