import { useState, useRef } from "react";
import { Platform, Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  subscriptionRequest,
  type CleanupReview,
} from "../../services/subscriptions";
import { exportAllReceipts } from "../../services/receipts";
import { storageSize } from "../../components/ReceiptStorage";
import AppScreen from "../components/common/AppScreen";
import PrimaryButton from "../components/common/PrimaryButton";
export default function ReceiptStorageReview() {
  const router = useRouter();
  const [preference, setPreference] = useState<"newest" | "oldest">("newest"),
    [review, setReview] = useState<CleanupReview | null>(null),
    [working, setWorking] = useState(false),
    [downloaded, setDownloaded] = useState(false),
    [part, setPart] = useState(0),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Storage review failed. Please retry.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  const remove = () => {
    if (!review || !downloaded) return;
    const execute = () =>
      void run(async () => {
        const result = await subscriptionRequest<{ removed: number }>(
          "/cleanup-remove",
          {
            preference,
            fingerprint: review.fingerprint,
            downloadConfirmed: true,
          },
        );
        setReview(null);
        setDownloaded(false);
        setPart(0);
        setMessage(
          `${result.removed} extra receipts were queued for removal. Budget entries remain. Retained copies may take time to free storage.`,
        );
      });
    const text = `Remove ${review.extras.length} extra receipts? Confirm that you downloaded and opened the ZIP successfully. The ${review.keep.length} selected receipts and all budget entries will remain. Removal cannot be undone through the app.`;
    if (Platform.OS === "web") {
      if (window.confirm(text)) execute();
    } else
      Alert.alert("Remove extra receipts?", text, [
        { text: "Cancel", style: "cancel" },
        {
          text: "I checked the download — remove extras",
          style: "destructive",
          onPress: execute,
        },
      ]);
  };
  return (
    <AppScreen>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "700" }}>
          Review receipts after downgrade
        </Text>
        <Text>
          Choose which receipts to keep within the smaller allowance. Download
          the extras and check that the files open before confirming removal.
          Budget entries are preserved; new uploads remain blocked until you
          upgrade.
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["newest", "oldest"] as const).map((choice) => (
            <View key={choice} style={{ flex: 1 }}>
              <PrimaryButton
                title={`Keep ${choice}`}
                disabled={working}
                onPress={() => {
                  setPreference(choice);
                  setReview(null);
                  setDownloaded(false);
                  setPart(0);
                }}
              />
            </View>
          ))}
        </View>
        <Text>
          Selected: keep the {preference} receipts first. Files that do not fit
          are placed in the extra-receipt download.
        </Text>
        <PrimaryButton
          title="Preview receipts to keep and download"
          disabled={working}
          onPress={() =>
            void run(async () => {
              setReview(
                await subscriptionRequest<CleanupReview>("/cleanup-review", {
                  preference,
                }),
              );
              setDownloaded(false);
              setPart(0);
            })
          }
        />
        {review && (
          <>
            <Text>
              Keep: {review.keep.length} receipts (
              {storageSize(review.keptBytes)}). Extras: {review.extras.length}{" "}
              receipts ({storageSize(review.extraBytes)}).
            </Text>
            {review.retainedBytes > 0 && (
              <Text>
                Pending cleanup/retained copies also use{" "}
                {storageSize(review.retainedBytes)}. This can reduce the space
                currently available.
              </Text>
            )}
            {review.extras.map((receipt) => (
              <Text key={receipt.receiptId}>
                Extra: {receipt.originalFilename} ·{" "}
                {receipt.transactionDate || "Undated"} ·{" "}
                {storageSize(receipt.fileSize)}
              </Text>
            ))}
            {review.extras.length > 0 && (
              <>
                <PrimaryButton
                  title={`Download extra receipts ZIP ${part + 1} of ${review.exportParts?.length || 1}`}
                  disabled={working || downloaded}
                  onPress={() =>
                    void run(async () => {
                      await exportAllReceipts(
                        `?keep=${preference}&review=${review.fingerprint}&part=${part}`,
                      );
                      setPart(part + 1);
                      setDownloaded(
                        part + 1 >= (review.exportParts?.length || 1),
                      );
                      setMessage(
                        "Open the downloaded ZIP and verify the receipts before removing extras. Starting a download alone does not prove you saved it.",
                      );
                    })
                  }
                />
                <PrimaryButton
                  title="I checked the downloaded files — remove extras"
                  disabled={working || !downloaded}
                  onPress={remove}
                />
              </>
            )}
          </>
        )}
        {message ? (
          <Text accessibilityLiveRegion="polite">{message}</Text>
        ) : null}
        <PrimaryButton
          title="Back to family plan"
          onPress={() => router.back()}
        />
      </View>
    </AppScreen>
  );
}
