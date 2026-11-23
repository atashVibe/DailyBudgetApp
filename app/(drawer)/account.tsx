import SettingsScreen from "./settings";
// Reuse the existing account/profile handlers and deletion confirmation guards.
export default function AccountScreen() {
  return <SettingsScreen accountOnly />;
}
