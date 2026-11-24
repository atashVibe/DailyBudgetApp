import { Picker } from "@react-native-picker/picker";
import { Platform, View } from "react-native";
import { useState } from "react";
import { uiTokens } from "./dashboardStyles";

type PickerOption = {
  label: string;
  value: string;
  type?: string;
};

type Props = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  disabled?: boolean;
  tall?: boolean;
  accessibilityLabel?: string;
};

export default function AppPicker({
  selectedValue,
  onValueChange,
  options,
  disabled = false,
  tall = false,
  accessibilityLabel,
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        ...(tall ? { height: 48 } : {}),
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? uiTokens.primary : uiTokens.border,
        borderRadius: 12,
        marginBottom: tall ? 0 : 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Picker
        accessibilityLabel={accessibilityLabel}
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
          height: tall ? 46 : 48,
          paddingVertical: Platform.OS === "web" ? 0 : undefined,
          paddingHorizontal: Platform.OS === "web" ? 12 : undefined,
          borderWidth: Platform.OS === "web" ? 0 : undefined,
        }}
        dropdownIconColor="#111827"
      >
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={
              option.type && (focused || option.value !== selectedValue)
                ? `${selectedValue === option.value ? "✓ " : ""}${option.label} · ${option.type === "expense" ? "Expense" : "+ " + option.type.charAt(0).toUpperCase() + option.type.slice(1)}`
                : option.label
            }
            color={
              option.type && option.type !== "expense"
                ? uiTokens.tealText
                : uiTokens.text
            }
            style={
              option.type && selectedValue === option.value
                ? { backgroundColor: uiTokens.tint }
                : undefined
            }
            value={option.value}
          />
        ))}
      </Picker>
    </View>
  );
}
