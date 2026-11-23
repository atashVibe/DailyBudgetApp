import { useState, useEffect } from "react";
import { View } from "react-native";
import Text from "../common/AppText";
import AppTextInput from "../common/AppTextInput";
import PrimaryButton from "../common/PrimaryButton";
import { uiTokens as t, uiStyles as s } from "../common/dashboardStyles";
type Props = {
  name: string;
  message: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
};
export default function ProfileNameSection({
  name,
  message,
  onNameChange,
  onSave,
}: Props) {
  const [saved, setSaved] = useState(name),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (message === "Name saved") setSaved(name);
  }, [name, message]);
  return (
    <View style={s.card}>
      <Text style={s.heading}>Your name</Text>
      <Text style={s.helper}>Shown to the other members of your family.</Text>
      <AppTextInput
        style={{ marginBottom: 0 }}
        accessibilityLabel="Your name"
        editable={!busy}
        value={name}
        onChangeText={onNameChange}
        placeholder="Enter your name"
        autoCapitalize="words"
        maxLength={80}
      />
      {name !== saved && (
        <PrimaryButton
          title="Save name"
          loading={busy}
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await onSave();
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {message && message !== "Name saved" ? (
        <Text accessibilityRole="alert" style={[s.helper, { color: t.danger }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
