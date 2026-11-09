/**
 * Progress Route File (Figma Screen 38 & 39)
 * Parents see ChildProgressScreen (with the encouragement modal); independent users see their own progress (F5).
 */
import ChildProgressScreen from "@/features/progress/ChildProgressScreen";
import MyProgressScreen from "@/features/progress/MyProgressScreen";
import { useMine } from "@/lib/dashboard";

export default function ProgressPageRoute() {
  const { user } = useMine();
  return user?.accountType === "independent" ? <MyProgressScreen /> : <ChildProgressScreen />;
}
