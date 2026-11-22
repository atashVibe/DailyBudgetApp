import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { auth } from "../../services/auth";
import { getFamilyContext, type FamilyContext } from "../../services/families";
import { getReceiptAccess, type ReceiptAccess } from "../../services/receipts";
import AppScreen from "../components/common/AppScreen";
import PrimaryButton from "../components/common/PrimaryButton";

export default function PremiumScreen() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilyContext | null>(null);
  const [access, setAccess] = useState<ReceiptAccess | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFamily(null);
      setAccess(null);
      setError("");
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      void Promise.all([getFamilyContext(user.uid), getReceiptAccess()])
        .then(([context, plan]) => {
          if (active && auth.currentUser?.uid === user.uid) {
            setFamily(context);
            setAccess(plan);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "Your family plan could not be loaded. Return to receipts and retry.",
            );
        });
      return () => {
        active = false;
      };
    }, [router]),
  );
  return (
    <AppScreen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Family Premium</Text>
        <Text style={{ fontSize: 17, lineHeight: 25 }}>
          One family plan enables receipt uploads for every current family
          member.
        </Text>
        <Text style={{ lineHeight: 23 }}>
          Attach original photos and PDFs to budget entries. Current members
          share access to view, download, replace and delete family receipts
          while the plan permits it.
        </Text>
        {family && (
          <Text style={{ fontWeight: "600" }}>Family: {family.familyName}</Text>
        )}
        {access?.canUpload && (
          <Text style={{ color: "#087F65", lineHeight: 23 }}>
            Receipt uploads are already included for your family.
          </Text>
        )}
        {family?.role === "member" && (
          <Text style={{ lineHeight: 23 }}>
            Only a family administrator can purchase a family plan. Ask your
            administrator to manage Premium for the family.
          </Text>
        )}
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#E6FAF5",
            gap: 10,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 18 }}>
            Purchasing is not available yet
          </Text>
          <Text style={{ lineHeight: 23 }}>
            Premium checkout and pricing are being prepared. This page does not
            activate a paid plan or take payment.
          </Text>
          <PrimaryButton
            title="Purchases coming soon"
            onPress={() => {}}
            disabled
          />
        </View>
        <Text style={{ fontWeight: "700", fontSize: 20 }}>
          If Premium access ends
        </Text>
        <Text style={{ lineHeight: 24 }}>
          New uploads and replacements stop. Current family members have a
          30-day grace period to view, download and export existing receipts.
          The app shows the deletion deadline.
        </Text>
        <Text style={{ lineHeight: 24 }}>
          After the grace period, scheduled cleanup deletes eligible receipt
          files and metadata. Budget entries remain. Renewing Premium or
          activating Archive before deletion preserves files that are still
          there; deleted files cannot be restored by renewing.
        </Text>
        {access?.deletionScheduledAt && (
          <Text style={{ color: "#9A3412", lineHeight: 24 }}>
            Your family’s receipt deletion deadline:{" "}
            {new Date(access.deletionScheduledAt).toLocaleString()}.
          </Text>
        )}
        <Text style={{ lineHeight: 23 }}>
          A family with separately granted receipt-administrator sponsorship can
          continue to have upload access independently of a paid plan.
        </Text>
        {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
        <PrimaryButton
          title="Back to family receipts"
          onPress={() => router.replace("/(drawer)/receipts")}
        />
      </View>
    </AppScreen>
  );
}
