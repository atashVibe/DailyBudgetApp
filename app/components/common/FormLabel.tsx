import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
type Props = {
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
};
export default function FormLabel({ children, icon }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
      }}
    >
      {icon && <Ionicons name={icon} size={18} color="#263B55" />}
      <Text style={{ fontSize: 15, color: "#172B44" }}>{children}</Text>
    </View>
  );
}
