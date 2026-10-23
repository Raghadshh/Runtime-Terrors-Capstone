import '../global.css';
import { useFonts, Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { DashboardProvider } from '../src/shared/lib/dashboard';
import { AccountsProvider } from '../src/features/accounts/AccountsContext';
import { RoutinesProvider } from '../src/features/routines/RoutinesContext';
import { TasksProvider } from '../src/features/tasks/TasksContext';
import { ReminderSync } from '../src/features/tasks/ReminderSync';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold });
  if (!fontsLoaded) return null;

  return (
    <AccountsProvider>
      <TasksProvider>
        <RoutinesProvider><DashboardProvider><ReminderSync /><Stack screenOptions={{ headerShown: false }} /></DashboardProvider></RoutinesProvider>
      </TasksProvider>
    </AccountsProvider>
  );
}