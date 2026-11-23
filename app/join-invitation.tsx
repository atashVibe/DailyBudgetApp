import { useLocalSearchParams, useRouter } from "expo-router";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Text from "./components/common/AppText";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../services/auth";
import { joinFamilyWithCode } from "../services/families";
import { invitationLink, validInvitationCode } from "../services/invitations";
import AppScreen from "./components/common/AppScreen";
import PrimaryButton from "./components/common/PrimaryButton";

export default function JoinInvitationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = validInvitationCode(params.code) ? params.code : "";
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        setUser(current);
        setVerified(current?.emailVerified === true);
        setReady(true);
        setMessage("");
      }),
    [],
  );
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please retry.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const join = () =>
    run(async () => {
      const current = auth.currentUser;
      if (!current?.email || !code) return;
      await current.reload();
      await current.getIdToken(true);
      if (!current.emailVerified) {
        setVerified(false);
        setMessage("Verify your email before joining this family.");
        return;
      }
      await joinFamilyWithCode(
        current.uid,
        current.email,
        code,
        current.displayName,
      );
      router.replace("/(drawer)/dashboard");
    });
  return (
    <AppScreen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Join a family</Text>
        {!ready ? (
          <Text>Loading invitation…</Text>
        ) : !code ? (
          <Text>
            This invitation link is invalid. Ask the family administrator for a
            new invitation.
          </Text>
        ) : (
          <>
            <Text style={{ lineHeight: 24 }}>
              Sign in or create an account with the email address that received
              this invitation. The code expires 10 minutes after it was created.
            </Text>
            <Text selectable style={{ fontSize: 24, fontWeight: "700" }}>
              Invitation code: {code}
            </Text>
            <Text style={{ lineHeight: 24 }}>
              Joining shares the family budget and permitted receipts with you.
              If you already belong to another family, joining switches your
              active family. Opening this link does not join automatically.
            </Text>
            {!ready ? (
              <Text>Checking your sign-in…</Text>
            ) : !user ? (
              <>
                <PrimaryButton
                  title="Sign in to join"
                  onPress={() =>
                    router.push({
                      pathname: "/login",
                      params: { inviteCode: code },
                    })
                  }
                />
                <PrimaryButton
                  title="Create an account to join"
                  onPress={() =>
                    router.push({
                      pathname: "/signup",
                      params: { inviteCode: code },
                    })
                  }
                />
              </>
            ) : (
              <>
                <Text>
                  Signed in as {user.email || "your current account"}.
                </Text>
                {!verified && (
                  <>
                    <Text style={{ lineHeight: 24 }}>
                      Verify your email before joining. This keeps invitations
                      private to the intended recipient.
                    </Text>
                    <PrimaryButton
                      title="Email me a verification link"
                      disabled={working}
                      onPress={() =>
                        void run(async () => {
                          const current = auth.currentUser;
                          if (!current) return;
                          await sendEmailVerification(current, {
                            url: invitationLink(code),
                          });
                          setMessage(
                            "Verification email sent. Open it, then return and check verification. If the invitation expires, ask for a new one.",
                          );
                        })
                      }
                    />
                    <PrimaryButton
                      title="I verified my email"
                      disabled={working}
                      onPress={() =>
                        void run(async () => {
                          const current = auth.currentUser;
                          if (!current) return;
                          await current.reload();
                          await current.getIdToken(true);
                          setVerified(current.emailVerified);
                          setMessage(
                            current.emailVerified
                              ? "Email verified. You can join the family now."
                              : "Your email is not verified yet. Open the verification email first.",
                          );
                        })
                      }
                    />
                  </>
                )}
                <PrimaryButton
                  title="Join this family"
                  disabled={working || !verified}
                  loading={working && verified}
                  onPress={() => void join()}
                />
                <PrimaryButton
                  title="Use a different account"
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      if (Platform.OS !== "web") {
                        try {
                          await GoogleSignin.signOut();
                        } catch {
                          /* No native Google session to clear. */
                        }
                      }
                      await signOut(auth);
                    })
                  }
                />
                {message.includes("only administrator") && (
                  <PrimaryButton
                    title="Review current family options"
                    onPress={() => router.push("/(drawer)/join-family")}
                  />
                )}
              </>
            )}
          </>
        )}
        {message ? (
          <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
            {message}
          </Text>
        ) : null}
      </View>
    </AppScreen>
  );
}
