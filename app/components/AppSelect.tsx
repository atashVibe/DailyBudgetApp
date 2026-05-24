import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Option = {
  label: string;
  value: string;
};

type Props = {
  label?: string;
  value?: string;
  placeholder?: string;

  options: Option[];

  onSelect: (value: string) => void;
};

export default function AppSelect({
  label,
  value,
  placeholder = "Select...",
  options,
  onSelect,
}: Props) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.selectBox}>
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.optionButton, isSelected && styles.selectedOption]}
            >
              <Text
                style={[styles.optionText, isSelected && styles.selectedText]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {!value && <Text style={styles.placeholder}>{placeholder}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,

    fontWeight: "600",

    marginBottom: 8,

    color: "#374151",
  },

  selectBox: {
    borderWidth: 1,

    borderColor: "#D1D5DB",

    borderRadius: 12,

    padding: 8,

    backgroundColor: "#FFFFFF",
  },

  optionButton: {
    height: 44,

    borderRadius: 10,

    justifyContent: "center",

    paddingHorizontal: 12,

    marginBottom: 6,
  },

  selectedOption: {
    backgroundColor: "#0CB48A",
  },

  optionText: {
    fontSize: 16,

    color: "#111827",
  },

  selectedText: {
    color: "#FFFFFF",

    fontWeight: "600",
  },

  placeholder: {
    color: "#9CA3AF",

    fontSize: 16,

    padding: 8,
  },
});
