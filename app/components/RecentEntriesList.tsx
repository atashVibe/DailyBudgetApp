import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  View,
  Pressable,
  useWindowDimensions,
} from "react-native";
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
  const wide = useWindowDimensions().width >= 600;
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
      try {
        await deleteEntry(entryId);
        onEntryDeleted?.(entryId);
      } catch (error) {
        console.error("Delete failed", error);
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
    <View style={ui.card}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <View
          style={{ backgroundColor: "#DFEAFE", borderRadius: 12, padding: 7 }}
        >
          <Ionicons name="list" size={24} color="#173963" />
        </View>
        <Text style={[ui.title, { flex: 1 }]}>Recent entries</Text>
        {entries.length > 3 && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setVisibleCount(visibleCount === 3 ? entries.length : 3)
            }
          >
            <Text style={{ color: "#183F70", fontWeight: "600" }}>
              {visibleCount === 3 ? "View All ›" : "Show Less"}
            </Text>
          </Pressable>
        )}
      </View>
      <Modal
        visible={receiptTransactionId !== null}
        onRequestClose={() => setReceiptTransactionId(null)}
        animationType="slide"
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
        <Text style={{ color: "#666" }}>No entries yet.</Text>
      ) : (
        <>
          {entries.slice(0, visibleCount).map((entry) => (
            <View
              key={entry.id}
              accessibilityLabel={`$${Number(entry.amount || 0).toFixed(2)} - ${categoryMap[entry.categoryId ?? ""] ?? "Unknown Category"}`}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor:
                  entry.id === editingEntryId ? tokens.tint : tokens.card,
                borderRadius: 8,
                paddingHorizontal: 6,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 36,
                  marginRight: 8,
                  borderRadius: 10,
                  backgroundColor: "#DDF5E9",
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
                  size={22}
                  color="#118762"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 14, fontWeight: "700", color: "#15263E" }}
                >
                  {categoryMap[entry.categoryId ?? ""] ?? "Unknown Category"}
                </Text>
                <Text
                  style={{ fontSize: 13, color: tokens.muted, marginTop: 3 }}
                >
                  {typeof entry.date === "string" && entry.date
                    ? new Date(
                        `${entry.date.split("T")[0]}T12:00:00`,
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Undated"}
                </Text>
                {entry.note ? (
                  <Text
                    numberOfLines={2}
                    style={{ fontSize: 13, color: tokens.muted }}
                  >
                    {entry.note}
                  </Text>
                ) : null}
                {entry.type !== "expense" && (
                  <Text style={{ fontSize: 13, color: tokens.muted }}>
                    {entry.type}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: wide ? 17 : 14,
                  fontWeight: "700",
                  color: "#101D32",
                  marginRight: 8,
                }}
              >
                ${Number(entry.amount || 0).toFixed(2)}
              </Text>
              {/* RIGHT SIDE */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  width: wide ? undefined : "100%",
                  justifyContent: "flex-end",
                  marginTop: wide ? 0 : 8,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Manage family receipts for this entry"
                  onPress={() => setReceiptTransactionId(entry.id)}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="attach-outline"
                    size={21}
                    color={tokens.tealText}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit this entry"
                  onPress={() => onEditEntry?.(entry)}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color={tokens.tealText}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete this entry"
                  onPress={() => handleDeleteEntry(entry.id)}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={21}
                    color={tokens.danger}
                  />
                </Pressable>
              </View>
            </View>
          ))}
          {visibleCount < entries.length && (
            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title="Load more"
                onPress={() => setVisibleCount((prev) => prev + 10)}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
