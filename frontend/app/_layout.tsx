import '../global.css';
import { useFonts, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { DashboardProvider } from '../src/shared/lib/dashboard';
import { AccountsProvider } from '../src/features/accounts/AccountsContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  if (!fontsLoaded) return null;

  return (
    <AccountsProvider>
      <DashboardProvider><Stack screenOptions={{ headerShown: false }} /></DashboardProvider>
    </AccountsProvider>
  );
}
