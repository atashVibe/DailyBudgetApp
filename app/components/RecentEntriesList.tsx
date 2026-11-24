import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Alert, Modal, Platform, View, Pressable } from "react-native";
import Text from "./common/AppText";
import {
  dashboardStyles as ui,
  uiTokens as tokens,
} from "./common/dashboardStyles";
import ReceiptPanel from "../../components/ReceiptPanel";
import AppScreen from "./common/AppScreen";
import { getAllCategoriesForFamily } from "../../services/categories";
import { deleteEntry } from "../../services/entries";
import PrimaryButton from "./common/PrimaryButton";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
  date?: string;
  budgetAreaId?: string;
  categoryId?: string;
  familyId?: string;
  userId?: string;
};

type Props = {
  familyId: string;
  entries: Entry[];
  onEditEntry?: (entry: Entry) => void;
  editingEntryId?: string | null;
  refreshSignal?: number;
  onEntryDeleted?: (entryId: string) => void;
};
export default function RecentEntriesList({
  familyId,
  entries,
  onEditEntry,
  editingEntryId,
  refreshSignal,
  onEntryDeleted,
}: Props) {
  const [deleteError, setDeleteError] = useState("");
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(3);
  const [receiptTransactionId, setReceiptTransactionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!familyId) return;
    let active = true;

    const loadCategories = async () => {
      try {
        const categories = await getAllCategoriesForFamily(familyId);

        if (!active) return;

        const mappedCategories: Record<string, string> = {};

        categories.forEach((category) => {
          mappedCategories[category.id] = category.name;
        });

        setCategoryMap(mappedCategories);
        setIconMap(
          Object.fromEntries(
            categories.map((category) => [
              category.id,
              category.iconName ||
                (/grocer|market/i.test(category.name)
                  ? "cart-outline"
                  : /restaurant|dining/i.test(category.name)
                    ? "restaurant-outline"
                    : /transport|car|fuel/i.test(category.name)
                      ? "car-outline"
                      : "pricetag-outline"),
            ]),
          ),
        );
      } catch (error) {
        console.error("Failed to load entry categories:", error);
        if (active) setCategoryMap({});
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, [refreshSignal, familyId]);

  const handleDeleteEntry = async (entryId: string) => {
    const runDelete = async () => {
      setDeleteError("");
      try {
        await deleteEntry(entryId);
        onEntryDeleted?.(entryId);
      } catch (error) {
        console.error("Delete failed", error);
        setDeleteError("The entry could not be deleted. Please try again.");
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this entry?",
      );
      if (confirmed) {
        await runDelete();
      }
      return;
    }

    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void runDelete() },
    ]);
  };

  return (
    <View style={ui.card} testID="recent-entries-card">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Text style={[ui.title, { flex: 1 }]}>Recent entries</Text>
        {entries.length > 3 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all recent entries"
            accessibilityState={{ expanded: visibleCount > 3 }}
            onPress={() =>
              setVisibleCount(visibleCount === 3 ? entries.length : 3)
            }
            style={{
              minHeight: 48,
              paddingLeft: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: tokens.tealText,
                fontWeight: "500",
              }}
            >
              View all
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={tokens.tealText}
            />
          </Pressable>
        ) : null}
      </View>
      {deleteError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: tokens.danger, fontSize: 13 }}
        >
          {deleteError}
        </Text>
      ) : null}
      <Modal
        visible={receiptTransactionId !== null}
        onRequestClose={() => setReceiptTransactionId(null)}
        animationType="fade"
      >
        <AppScreen>
          <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
            Family Entry Receipts
          </Text>
          <View style={{ marginBottom: 20 }}>
            <PrimaryButton
              title="Close receipts"
              onPress={() => setReceiptTransactionId(null)}
            />
          </View>
          {receiptTransactionId && (
            <ReceiptPanel
              key={receiptTransactionId}
              transactionId={receiptTransactionId}
            />
          )}
        </AppScreen>
      </Modal>

      {entries.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: "center", gap: 5 }}>
          <Ionicons name="receipt-outline" size={24} color={tokens.muted} />
          <Text style={{ fontSize: 15, fontWeight: "500" }}>
            No entries yet
          </Text>
          <Text style={ui.detail}>Add your first entry above.</Text>
        </View>
      ) : (
        <>
          {entries.slice(0, visibleCount).map((entry, index) => {
            const incoming = ["income", "refund", "cashback"].includes(
              entry.type.toLowerCase(),
            );
            const category =
              categoryMap[entry.categoryId ?? ""] ||
              entry.category ||
              "Unknown category";
            const date = entry.date
              ? new Date(`${entry.date.split("T")[0]}T12:00:00`)
              : null;
            const now = new Date(),
              yesterday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - 1,
              );
            const dateLabel =
              !date || Number.isNaN(date.getTime())
                ? "Undated"
                : date.toDateString() === now.toDateString()
                  ? "Today"
                  : date.toDateString() === yesterday.toDateString()
                    ? "Yesterday"
                    : date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      });
            const expanded = openEntry === entry.id;
            return (
              <View
                key={entry.id}
                accessibilityLabel={`$${Number(entry.amount || 0).toFixed(2)} - ${category}`}
                style={{
                  borderBottomWidth:
                    index < Math.min(visibleCount, entries.length) - 1 ? 1 : 0,
                  borderBottomColor: tokens.border,
                  backgroundColor:
                    entry.id === editingEntryId ? tokens.tint : tokens.card,
                }}
              >
                <View
                  style={{
                    minHeight: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: tokens.tint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        (iconMap[entry.categoryId || ""] ||
                          "pricetag-outline") as React.ComponentProps<
                          typeof Ionicons
                        >["name"]
                      }
                      size={19}
                      color={tokens.tealText}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 15,
                        fontWeight: "500",
                        writingDirection: "auto",
                        textAlign: "auto",
                      }}
                    >
                      {category}
                    </Text>
                    <Text style={{ fontSize: 12, color: tokens.muted }}>
                      {dateLabel}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      fontVariant: ["tabular-nums"],
                      color: incoming ? tokens.tealText : tokens.text,
                    }}
                  >
                    {incoming ? "+" : "-"}$
                    {Number(entry.amount || 0).toFixed(2)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Entry actions"
                    accessibilityHint={`Receipt, edit and delete actions for ${category}`}
                    accessibilityState={{ expanded }}
                    onPress={() => setOpenEntry(expanded ? null : entry.id)}
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={expanded ? "close-outline" : "ellipsis-horizontal"}
                      size={20}
                      color={tokens.muted}
                    />
                  </Pressable>
                </View>
                {expanded ? (
                  <View style={{ paddingBottom: 8, gap: 4 }}>
                    {entry.note ? (
                      <Text style={ui.detail}>{entry.note}</Text>
                    ) : null}
                    <Text style={ui.detail}>
                      {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Manage family receipts for this entry"
                        onPress={() => setReceiptTransactionId(entry.id)}
                        style={actionStyle}
                      >
                        <Ionicons
                          name="attach-outline"
                          size={20}
                          color={tokens.tealText}
                        />
                        <Text style={{ fontSize: 12, color: tokens.tealText }}>
                          Receipts
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit this entry"
                        onPress={() => onEditEntry?.(entry)}
                        style={actionStyle}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={tokens.tealText}
                        />
                        <Text style={{ fontSize: 12, color: tokens.tealText }}>
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete this entry"
                        onPress={() => handleDeleteEntry(entry.id)}
                        style={actionStyle}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={tokens.danger}
                        />
                        <Text style={{ fontSize: 12, color: tokens.danger }}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
          {visibleCount < entries.length ? (
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                title="Load more"
                variant="text"
                onPress={() => setVisibleCount((prev) => prev + 10)}
              />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
const actionStyle = {
  minWidth: 72,
  minHeight: 48,
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
} as const;
