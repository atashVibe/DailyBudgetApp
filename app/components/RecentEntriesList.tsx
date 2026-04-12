import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { auth, db } from "../../services/auth";
import PrimaryButton from "./PrimaryButton";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
  date?: string;
};

export default function RecentEntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setEntries([]);
        return;
      }

      const loadEntries = async () => {
        const entriesQuery = query(
          collection(db, "entries"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(entriesQuery);

        const items: Entry[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Entry, "id">),
        }));

        setEntries(items);
      };

      loadEntries();
    });

    return unsubscribe;
  }, []);

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
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600" }}>
                ${Number(entry.amount || 0).toFixed(2)} - {entry.category}
              </Text>
              <Text style={{ fontSize: 14, color: "#666" }}>
                {entry.date
                  ? `${new Date(entry.date).toLocaleDateString()} ${new Date(entry.date).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })} • `
                  : ""}
                {entry.type}
                {entry.note ? ` • ${entry.note}` : ""}
              </Text>
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