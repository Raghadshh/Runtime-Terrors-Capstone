/**
 * Progress Route File (Figma Screens 26, 27 and 28)
 * Renders the parent progress overview with the dashboard tab bar.
 */
import ChildProgressScreen from "@/features/progress/ChildProgressScreen";
import { DashboardTabBar } from "@/components/tab-bar";

export default function ProgressPageRoute() {
  return <ChildProgressScreen bottomBar={<DashboardTabBar activeIndex={3} />} />;
}
