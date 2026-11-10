/**
 * F5 progress dashboard for independent users (R20): their own tasks and routines.
 */
import { ScrollView } from "react-native";

import { Header } from "@/components/header";
import { Screen } from "@/components/screen";

import { ProgressOverview } from "./ProgressOverview";

export default function MyProgressScreen() {
  return (
    <Screen>
      <Header title="My Progress" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <ProgressOverview ownerId={null} />
      </ScrollView>
    </Screen>
  );
}
