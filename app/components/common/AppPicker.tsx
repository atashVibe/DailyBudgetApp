import { Picker } from "@react-native-picker/picker";
import { Platform, View } from "react-native";

type PickerOption = {
  label: string;
  value: string;
};

type Props = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
};

export default function AppPicker({
  selectedValue,
  onValueChange,
  options,
}: Props) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={{
          color: "#111827",
          backgroundColor: "#ffffff",
          height: Platform.OS === "web" ? 52 : undefined,
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


