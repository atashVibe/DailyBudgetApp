import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Platform, View } from "react-native";
import Text from "../app/components/common/AppText";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { preserveDashboardHistoryGuard } from "../services/dashboardHistory";
import PrimaryButton from "../app/components/common/PrimaryButton";

const SignOutContext = createContext<() => void>(() => {});
export const useRequestSignOut = () => useContext(SignOutContext);

export default function SignOutConfirmation({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web") return preserveDashboardHistoryGuard();
  }, []);
  const [visible, setVisible] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const request = useCallback(() => {
    if (auth.currentUser) {
      setError("");
      setVisible(true);
    }
  }, []);
  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    try {
      await signOut(auth);
      setVisible(false);
      router.replace("/login");
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };
  return (
    <SignOutContext.Provider value={request}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working) setVisible(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            role="dialog"
            aria-modal={true}
            accessibilityLabel="Sign out confirmation"
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 380,
              padding: 24,
              borderRadius: 16,
              backgroundColor: "#fff",
              gap: 14,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ fontSize: 18, fontWeight: "700" }}
            >
              Sign out of DailyBudget?
            </Text>
            <Text style={{ lineHeight: 22 }}>
              Unsaved changes will be lost. Choose Stay signed in to keep using
              DailyBudget.
            </Text>
            {error ? (
              <Text accessibilityRole="alert" style={{ color: "#B91C1C" }}>
                {error}
              </Text>
            ) : null}
            <PrimaryButton
              variant="text"
              title="Stay signed in"
              disabled={working}
              onPress={() => setVisible(false)}
            />
            <PrimaryButton
              variant="danger"
              title="Sign out"
              loading={working}
              onPress={() => void confirm()}
            />
          </View>
        </View>
      </Modal>
    </SignOutContext.Provider>
  );
}
