/**
 * Progress Route File (Figma Screens 26, 27, 28 and 38, 39)
 * Parents see the child progress overview with the dashboard tab bar;
 * independent users see their own progress (F5).
 */
import ChildProgressScreen from "@/features/progress/ChildProgressScreen";
import MyProgressScreen from "@/features/progress/MyProgressScreen";
import { DashboardTabBar } from "@/components/tab-bar";
import { useMine } from "@/lib/dashboard";

export default function ProgressPageRoute() {
  const { user } = useMine();
  if (user?.accountType === "independent") return <MyProgressScreen />;
  return <ChildProgressScreen bottomBar={<DashboardTabBar activeIndex={3} />} />;
}
