import { Text } from "react-native";

type Props = {
  children: React.ReactNode;
};

export default function FormLabel({ children }: Props) {
  return (
    <Text
      style={{
        fontSize: 16,
        marginBottom: 8,
        color: "#111827",
      }}
    >
      {children}
    </Text>
  );
}
