import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import Text from "./AppText";
import { uiStyles, uiTokens } from "./dashboardStyles";
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
      {icon && <Ionicons name={icon} size={18} color={uiTokens.muted} />}
      <Text style={uiStyles.body}>{children}</Text>
    </View>
  );
}
