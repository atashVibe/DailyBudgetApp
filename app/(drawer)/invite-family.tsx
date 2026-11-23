import * as Crypto from "expo-crypto";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Platform, Share, View } from "react-native";
import Text from "../components/common/AppText";
import { auth } from "../../services/auth";
import { getFamilyContext, type FamilyRole } from "../../services/families";
import {
  createShareInvitation,
  sendFamilyInvitation,
  validInvitationEmail,
  type InvitationResult,
} from "../../services/invitations";
import AppScreen from "../components/common/AppScreen";
import AppTextInput from "../components/common/AppTextInput";
import PrimaryButton from "../components/common/PrimaryButton";

export default function InviteFamilyScreen() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("member");
  const [canInvite, setCanInvite] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState<InvitationResult | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const lock = useRef(false);
  const request = useRef<{
    email: string;
    role: FamilyRole;
    id: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setResult(null);
      setCanInvite(null);
      setVerified(user?.emailVerified === true);
      request.current = null;
      if (!user) {
        setCanInvite(false);
        return;
      }
      void getFamilyContext(user.uid)
        .then((family) => {
          if (active && auth.currentUser?.uid === user.uid)
            setCanInvite(family?.role === "admin");
        })
        .catch(() => {
          if (active) {
            setCanInvite(false);
            setMessage(
              "Your invitation permissions could not be loaded. Reopen this screen and retry.",
            );
          }
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
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
      setSendingEmail(false);
    }
  };
  const create = (emailIt: boolean) =>
    run(async () => {
      const value = email.trim().toLowerCase();
      if (!canInvite || !validInvitationEmail(value)) return;
      if (
        !request.current ||
        request.current.email !== value ||
        request.current.role !== role
      )
        request.current = { email: value, role, id: Crypto.randomUUID() };
      const uid = auth.currentUser?.uid;
      setSendingEmail(emailIt);
      const next = emailIt
        ? await sendFamilyInvitation(value, role, request.current.id)
        : await createShareInvitation(value, role);
      if (auth.currentUser?.uid !== uid) return;
      setResult(next);
      if (next.status === "accepted")
        setMessage(
          `Invitation emailed to ${value}. If it is not in the inbox, check spam.`,
        );
      else if (next.status === "manual")
        setMessage(
          "Share invitation created. No email was sent; copy or share the link below.",
        );
      else if (next.status === "expired" || next.status === "used")
        setMessage(
          "This invitation is no longer pending. Change the email or reopen this screen to create a new one.",
        );
      else
        setMessage(
          "Email delivery has not been confirmed. You can copy or share the invitation below. Retrying the same request will not send a duplicate email.",
        );
    });
  const share = () =>
    run(async () => {
      if (!result?.joinUrl || !result.code) return;
      const text = `Join our family on DailyBudget using ${result.email}.\nCode: ${result.code}\n${result.joinUrl}\nExpires: ${new Date(result.expiresAt || 0).toLocaleString()}`;
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(text);
        setMessage("Invitation code and link copied.");
      } else await Share.share({ message: text });
    });
  return (
    <AppScreen>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          Invite a family member
        </Text>
        {canInvite === null ? (
          <Text>Loading invitation permissions…</Text>
        ) : !canInvite ? (
          <Text>
            Only a current family administrator can create invitations.
          </Text>
        ) : (
          <>
            <Text style={{ lineHeight: 23 }}>
              Send an email containing the invitation code and a link to join.
              The recipient must use this email address. Invitations expire in
              10 minutes.
            </Text>
            <AppTextInput
              accessibilityLabel="Invitation email"
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!working}
            />
            <Text>Invitation role</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["member", "admin"] as const).map((option) => (
                <View key={option} style={{ flex: 1 }}>
                  <PrimaryButton
                    title={`${role === option ? "✓ " : ""}${option === "admin" ? "Administrator" : "Member"}`}
                    disabled={working}
                    onPress={() => setRole(option)}
                  />
                </View>
              ))}
            </View>
            {role === "admin" && (
              <Text>
                Administrators can manage family settings and invite other
                members.
              </Text>
            )}
            {!verified && (
              <View style={{ gap: 10 }}>
                <Text>
                  Verify your own email address to send invitations
                  automatically. You can still create a share link.
                </Text>
                <PrimaryButton
                  variant="outline"
                  title="Verify my email address"
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      const user = auth.currentUser;
                      if (!user) return;
                      await sendEmailVerification(user, {
                        url: "https://atashvibe.github.io/DailyBudgetApp/login",
                      });
                      setMessage(
                        "Verification email sent. Open it, then check verification below.",
                      );
                    })
                  }
                />
                <PrimaryButton
                  variant="outline"
                  title="Check my email verification"
                  disabled={working}
                  onPress={() =>
                    void run(async () => {
                      const user = auth.currentUser;
                      if (!user) return;
                      await user.reload();
                      await user.getIdToken(true);
                      setVerified(user.emailVerified);
                      setMessage(
                        user.emailVerified
                          ? "Your email is verified."
                          : "Your email is not verified yet.",
                      );
                    })
                  }
                />
              </View>
            )}
            <PrimaryButton
              title="Send invitation email"
              disabled={working || !verified || !validInvitationEmail(email)}
              loading={working && sendingEmail}
              onPress={() => void create(true)}
            />
            <PrimaryButton
              variant="outline"
              title="Create a share link instead"
              disabled={working || !validInvitationEmail(email)}
              onPress={() => void create(false)}
            />
          </>
        )}
        {message ? (
          <Text accessibilityLiveRegion="polite" style={{ lineHeight: 24 }}>
            {message}
          </Text>
        ) : null}
        {result?.code && result.joinUrl && (
          <View
            style={{
              gap: 12,
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#E6FAF5",
            }}
          >
            <Text style={{ fontWeight: "700" }}>
              Invitation for {result.email}
            </Text>
            <Text selectable style={{ fontSize: 24, fontWeight: "700" }}>
              {result.code}
            </Text>
            <Text selectable style={{ lineHeight: 23 }}>
              {result.joinUrl}
            </Text>
            <Text>
              Expires: {new Date(result.expiresAt || 0).toLocaleString()}
            </Text>
            <PrimaryButton
              title={
                Platform.OS === "web"
                  ? "Copy code and join link"
                  : "Share code and join link"
              }
              disabled={working}
              onPress={() => void share()}
            />
          </View>
        )}
        {result && (
          <PrimaryButton
            variant="outline"
            title="Start another invitation"
            disabled={working}
            onPress={() => {
              request.current = null;
              setResult(null);
              setEmail("");
              setMessage("");
            }}
          />
        )}
      </View>
    </AppScreen>
  );
}
