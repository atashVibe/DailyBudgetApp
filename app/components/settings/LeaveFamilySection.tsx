import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { auth } from "../../../services/auth";
import {
  prepareFamilyLeave,
  leaveFamily,
  type FamilyLeaveReview,
} from "../../../services/familyLeaving";
import Text from "../common/AppText";
import PrimaryButton from "../common/PrimaryButton";
import SettingsSheet from "../common/SettingsSheet";
import LoadingSpinner from "../common/LoadingSpinner";
import { uiStyles as ui, uiTokens } from "../common/dashboardStyles";

export default function LeaveFamilySection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<FamilyLeaveReview | null>(null);
  const [message, setMessage] = useState("");
  const account = useRef("");
  const lock = useRef(false);
  const prepare = async () => {
    if (lock.current) return;
    lock.current = true;
    account.current = auth.currentUser?.uid || "";
    setOpen(true);
    setBusy(true);
    setReview(null);
    setMessage("");
    try {
      const data = await prepareFamilyLeave(account.current);
      if (auth.currentUser?.uid === account.current) setReview(data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Family information could not be checked. Please retry.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const confirm = async () => {
    if (lock.current || !review?.canLeave) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await leaveFamily(account.current, review);
      setOpen(false);
      router.replace("/family-setup");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your family could not be updated. Reopen the confirmation and retry.",
      );
      setReview(null);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <>
      <View style={ui.card}>
        <Text style={ui.heading}>Family membership</Text>
        <Text style={ui.helper}>
          Leave this family while keeping your DailyBudget account.
        </Text>
        <PrimaryButton
          variant="outline"
          title="Leave family"
          onPress={() => void prepare()}
        />
      </View>
      <SettingsSheet
        visible={open}
        title="Leave family?"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        busy={busy}
      >
        {busy && !review ? (
          <LoadingSpinner message="Checking family membership…" />
        ) : null}
        {review ? (
          <>
            <Text style={ui.heading}>{review.familyName}</Text>
            <Text style={ui.body}>
              Your account stays active. The family keeps its entries and
              receipts, and you will lose access to them. You can start a new
              family or join another one afterwards.
            </Text>
            {review.isStorePayer ? (
              <Text style={ui.helper}>
                Leaving does not cancel your store subscription. Manage it
                through the store where you purchased it.
              </Text>
            ) : null}
            {!review.canLeave ? (
              <Text
                accessibilityRole="alert"
                style={{ color: uiTokens.danger }}
              >
                {review.reason}
              </Text>
            ) : null}
            {review.canLeave ? (
              <PrimaryButton
                variant="danger"
                title="Leave family"
                loading={busy}
                onPress={() => void confirm()}
              />
            ) : (
              <PrimaryButton
                title="Invite another administrator"
                onPress={() => {
                  setOpen(false);
                  router.push("/(drawer)/invite-family");
                }}
              />
            )}
          </>
        ) : null}
        {message ? (
          <Text accessibilityRole="alert" style={{ color: uiTokens.danger }}>
            {message}
          </Text>
        ) : null}
        {!busy && !review ? (
          <PrimaryButton
            variant="outline"
            title="Check membership again"
            onPress={() => void prepare()}
          />
        ) : null}
        <PrimaryButton
          variant="text"
          title="Cancel"
          disabled={busy}
          onPress={() => setOpen(false)}
        />
      </SettingsSheet>
    </>
  );
}
