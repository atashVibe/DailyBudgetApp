import { forwardRef, type ElementRef } from "react";
import { Text as NativeText, type TextProps, StyleSheet } from "react-native";
import { uiStyles } from "./dashboardStyles";
// Shared presentation only: native text behavior/props/ref are preserved.
const AppText = forwardRef<ElementRef<typeof NativeText>, TextProps>(
  function AppText(props, ref) {
    const localStyle = StyleSheet.flatten(props.style);
    const lineHeight =
      localStyle?.lineHeight || Math.ceil((localStyle?.fontSize || 15) * 1.45);
    return (
      <NativeText
        {...props}
        {...{ dir: "auto" }}
        ref={ref}
        style={[uiStyles.body, { lineHeight }, props.style]}
      />
    );
  },
);
export default AppText;
