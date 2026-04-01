import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { auth, db } from "../../services/auth";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
};

export default function RecentEntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const loadEntries = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snapshot = await getDocs(collection(db, "entries"));

      const items: Entry[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Entry, "id">),
      }));

      setEntries(items);
    };

    loadEntries();
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
        entries.map((entry) => (
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
              {entry.type} {entry.note ? `• ${entry.note}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}