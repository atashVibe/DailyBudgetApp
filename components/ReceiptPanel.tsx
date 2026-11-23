import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  receiptsConfigured,
  getReceiptAccess,
  listReceipts,
  pickReceipt,
  uploadReceipt,
  deleteReceipt,
  openReceipt,
  exportAllReceipts,
  type Receipt,
  type ReceiptAccess,
  type ReceiptFile,
} from "../services/receipts";
import PrimaryButton from "../app/components/common/PrimaryButton";
import ReceiptStorage from "./ReceiptStorage";

export default function ReceiptPanel({
  transactionId,
}: {
  transactionId?: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<ReceiptAccess | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [retry, setRetry] = useState<{
    file: ReceiptFile;
    replaceId?: string;
  } | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!receiptsConfigured) return;
    const [nextAccess, nextReceipts] = await Promise.all([
      getReceiptAccess(),
      listReceipts(transactionId),
    ]);
    if (mounted.current) {
      setAccess(nextAccess);
      setReceipts(nextReceipts);
    }
  }, [transactionId]);
  useEffect(() => {
    setAccess(null);
    setReceipts([]);
    setMessage("");
    setRetry(null);
    refresh().catch((error) => {
      if (mounted.current) setMessage(error.message);
    });
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Receipt action failed. Please retry.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) {
        setWorking(false);
        setProgress(null);
      }
    }
  };
  const send = async (file: ReceiptFile, replaceId?: string) => {
    if (!transactionId || !access) return;
    if (file.size > access.limits.maxFileBytes)
      throw new Error(
        `Choose a file smaller than ${access.limits.maxFileBytes / 1e6} MB.`,
      );
    setRetry({ file, replaceId });
    setProgress(0);
    await uploadReceipt(
      file,
      transactionId,
      (value) => {
        if (mounted.current) setProgress(value);
      },
      replaceId,
    );
    setRetry(null);
    await refresh();
    setMessage("Original receipt saved.");
  };
  const choose = (kind: "camera" | "photo" | "pdf", replaceId?: string) =>
    run(async () => {
      const file = await pickReceipt(kind);
      if (file) await send(file, replaceId);
    });
  const remove = (receipt: Receipt) => {
    const action = () =>
      void run(async () => {
        await deleteReceipt(receipt.receiptId);
        await refresh();
        setMessage(
          "Deletion requested. Retained copies are tracked until cleanup is verified.",
        );
      });
    const warning =
      "Delete this original receipt? Your budget entry will remain. This cannot be undone through the app.";
    if (Platform.OS === "web") {
      if (window.confirm(warning)) action();
    } else
      Alert.alert("Delete receipt?", warning, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: action },
      ]);
  };
  if (!receiptsConfigured)
    return (
      <Text style={{ fontSize: 16, lineHeight: 24 }}>
        Receipt storage is not set up yet. Your budget entries are available as
        usual.
      </Text>
    );
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, lineHeight: 24 }}>
        These receipts are shared with current family members. Uploads,
        replacements and downloads depend on the family plan. Other families
        cannot access them.
      </Text>
      {access && (
        <>
          <Text>
            {access.familyName} · Family access:{" "}
            {access.administrator
              ? "Receipt administrator — family access included"
              : access.administratorFamily
                ? "Included through a receipt administrator"
                : access.tier}
          </Text>
          {!transactionId && <ReceiptStorage access={access} />}
          {access.deletionScheduledAt && (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: "#9A3412", fontSize: 16, lineHeight: 24 }}
            >
              Family receipt deletion is scheduled for{" "}
              {new Date(access.deletionScheduledAt).toLocaleString()}. Download
              or export the family originals before then. Renewing family
              Premium or activating family Archive before that deadline
              preserves existing files. Files already deleted cannot be
              recovered through the app.
            </Text>
          )}
          {transactionId && access.canUpload && (
            <>
              <Text>
                JPG, JPEG, PNG or PDF · up to {access.limits.maxFileBytes / 1e6}{" "}
                MB each · {access.limits.maxReceiptsPerTransaction} receipts per
                entry.
              </Text>
              <PrimaryButton
                title="Photograph a receipt"
                onPress={() => void choose("camera")}
                disabled={working}
              />
              <PrimaryButton
                title="Choose a photo"
                onPress={() => void choose("photo")}
                disabled={working}
              />
              <PrimaryButton
                title="Choose a PDF"
                onPress={() => void choose("pdf")}
                disabled={working}
              />
            </>
          )}
          {!transactionId && (
            <Text>
              To attach a receipt, use the paperclip beside a saved entry in
              this family.
            </Text>
          )}
          {(!(access.plan.startsWith("premium") && access.active) ||
            access.usage.liveBytes + access.usage.reservedBytes >=
              access.limits.maxStorageBytes ||
            access.downgradeUploadBlocked) && (
            <View style={{ gap: 8 }}>
              <Text>
                {access.canUpload
                  ? "Your family already has sponsored receipt access. View family Premium details below."
                  : "Enable receipt uploads for your family with Premium."}
              </Text>
              <PrimaryButton
                title="Upgrade family to Premium"
                onPress={() => router.push("/(drawer)/premium")}
              />
              <Text>
                View plans, billing availability and cancellation rules.
              </Text>
            </View>
          )}
          {access.plan.startsWith("premium") && access.active && (
            <PrimaryButton
              title="Manage family subscription"
              onPress={() => router.push("/(drawer)/premium")}
            />
          )}
          {access.canRead && (
            <PrimaryButton
              title="Export family receipts (ZIP)"
              onPress={() => void run(exportAllReceipts)}
              disabled={working}
            />
          )}
        </>
      )}
      {progress !== null && (
        <Text accessibilityLiveRegion="polite">
          Upload: {progress}%
          {progress === 100 ? " — checking and saving your original…" : ""}
        </Text>
      )}
      {retry && !working && (
        <PrimaryButton
          title="Retry the same upload"
          onPress={() => void run(() => send(retry.file, retry.replaceId))}
        />
      )}
      {receipts.length === 0 && access && <Text>No receipts here yet.</Text>}
      {receipts.map((receipt) => (
        <View
          key={receipt.receiptId}
          style={{
            gap: 10,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: "#D1D5DB",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {receipt.originalFilename}
          </Text>
          <Text>
            {receipt.transactionDate || "Undated"} ·{" "}
            {(receipt.fileSize / 1024).toFixed(0)} KB ·{" "}
            {receipt.status === "deleting"
              ? "Deletion pending verification (retained copies may remain)"
              : "Original saved"}
          </Text>
          {receipt.status === "ready" && (
            <>
              {access?.canRead && (
                <>
                  <PrimaryButton
                    title="View original"
                    onPress={() => void run(() => openReceipt(receipt, true))}
                    disabled={working}
                  />
                  <PrimaryButton
                    title="Download original"
                    onPress={() => void run(() => openReceipt(receipt))}
                    disabled={working}
                  />
                </>
              )}
              {transactionId && access?.canReplace && (
                <>
                  <PrimaryButton
                    title="Replace with photo"
                    onPress={() => void choose("photo", receipt.receiptId)}
                    disabled={working}
                  />
                  <PrimaryButton
                    title="Replace with PDF"
                    onPress={() => void choose("pdf", receipt.receiptId)}
                    disabled={working}
                  />
                </>
              )}
              <PrimaryButton
                title="Delete receipt"
                onPress={() => remove(receipt)}
                disabled={working}
              />
            </>
          )}
        </View>
      ))}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: "#374151", lineHeight: 24 }}
        >
          {message}
        </Text>
      ) : null}
      <PrimaryButton
        title="Refresh receipts"
        onPress={() => void run(refresh)}
        disabled={working}
      />
    </View>
  );
}
