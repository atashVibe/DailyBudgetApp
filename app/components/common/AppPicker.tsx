import { Picker } from "@react-native-picker/picker";
import { Platform, View } from "react-native";
import { useState } from "react";
import { uiTokens } from "./dashboardStyles";

type PickerOption = {
  label: string;
  value: string;
};

type Props = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  disabled?: boolean;
  tall?: boolean;
};

export default function AppPicker({
  selectedValue,
  onValueChange,
  options,
  disabled = false,
  tall = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: focused ? uiTokens.primary : uiTokens.border,
        borderRadius: 12,
        marginBottom: tall ? 12 : 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Picker
        enabled={!disabled}
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          color: "#111827",
          backgroundColor: "#ffffff",
          width: "100%",
          minWidth: 0,
          fontSize: 16,
          fontFamily: uiTokens.font,
          height: 48,
          paddingVertical: Platform.OS === "web" ? 0 : undefined,
          paddingHorizontal: Platform.OS === "web" ? 12 : undefined,
          borderWidth: Platform.OS === "web" ? 0 : undefined,
        }}
        dropdownIconColor="#111827"
      >
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </View>
  );
}
