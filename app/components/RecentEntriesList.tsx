import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
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
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(10);

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
    <View
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 16,
        }}
      >
        Recent Entries
      </Text>

      {entries.length === 0 ? (
        <Text style={{ color: "#666" }}>No entries yet.</Text>
      ) : (
        <>
          {entries.slice(0, visibleCount).map((entry) => (
            <View
              key={entry.id}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor:
                  entry.id === editingEntryId ? "#9af2c6" : "#ffffff",
                borderRadius: 8,
                paddingHorizontal: 6,
              }}
            >
              {/* LEFT SIDE */}
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "600" }}>
                  ${Number(entry.amount || 0).toFixed(2)} -{" "}
                  {categoryMap[entry.categoryId ?? ""] ?? "Unknown Category"}
                </Text>

                <Text style={{ fontSize: 14, color: "#666" }}>
                  {entry.date
                    ? `${new Date(entry.date).toLocaleDateString()} ${new Date(
                        entry.date,
                      ).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })} • `
                    : ""}
                  {entry.type}
                  {entry.note ? ` • ${entry.note}` : ""}
                </Text>
              </View>

              {/* RIGHT SIDE */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color="#111"
                  onPress={() => onEditEntry?.(entry)}
                />

                <Ionicons
                  name="trash-outline"
                  size={22}
                  color="red"
                  onPress={() => handleDeleteEntry(entry.id)}
                />
              </View>
            </View>
          ))}
          {visibleCount < entries.length && (
            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title="Load More"
                onPress={() => setVisibleCount((prev) => prev + 10)}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
