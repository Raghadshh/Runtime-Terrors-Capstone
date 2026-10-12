/**
 * Child dashboard (wireframe 25) which is part of the dashboard (Home). A child's own view of today's tasks, routines, and points.
 */
import { useDashboardNavigation } from "@/lib/dashboardNavigation";
import { Pressable, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { dashboardArt } from "@assets/illustration";
import { Pip } from "@/components/pip";

import { Card } from "@/components/card";
import { Header } from "@/components/header";
import { ProgressBar } from "@/components/progress";
import { Screen } from "@/components/screen";
import { formatClock } from "@/lib/format";
import { useMine } from "@/lib/dashboard";

export default function ChildDashboardScreen() {
  const router = useDashboardNavigation();
  const { child, tasks, routines, user, rewards } = useMine();
  const open = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed).length;
  const routine = routines[0];
  const routineDone = routine?.steps.filter((step) => step.completed).length ?? 0;
  const nextReward = rewards.find((reward) => reward.points > (user?.points ?? 0));
  const name = child?.name || user?.preferredName || user?.name || "Friend";
  return (
    <Screen>
      <Header title="Today" />
      <Text className="mt-2 font-strong text-[24px] text-ink">Good morning, {name}!</Text>
      <Text className="font-body text-[14px] text-mist">You have {open.length} small wins waiting.</Text>
      <View className="mt-4 overflow-hidden rounded-[20px] p-4" style={{ backgroundColor: "#DDECF4", minHeight: 250 }}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <SvgXml xml={dashboardArt.bighill} width="100%" height={91} preserveAspectRatio="none" />
        </View>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 14 }}><SvgXml xml={dashboardArt.cloud} /></View>
        <View style={{ width: "57%" }}>
          <Text className="font-strong text-[15px] text-ink">Today’s progress</Text>
          <Text className="font-display text-[28px] text-ink">{done} of {tasks.length}</Text>
          <Text className="mb-2 font-body text-[13px] text-mist">tasks finished</Text>
          <ProgressBar percent={tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)} />
        </View>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", bottom: 60, right: 17 }}><Pip variant="home" /></View>
        <View className="mt-5 self-start rounded-[16px] bg-white px-3 py-2">
          <Text className="text-center font-strong text-[12px] text-ink">One small step</Text>
          <Text className="text-center font-strong text-[12px] text-ink">at a time!</Text>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", bottom: 8, left: 12 }}><SvgXml xml={dashboardArt.leaf} /></View>
        <View pointerEvents="none" style={{ position: "absolute", bottom: 8, right: 12 }}><SvgXml xml={dashboardArt.leaf2} /></View>
      </View>
      <Text className="mb-2 mt-4 font-strong text-[16px] text-ink">Up next</Text>
      {open.slice(0, 2).map((task) => (
        <Card key={task.id} onPress={() => router.push(`/tasks/${task.id}?childView=1`)} className="mb-2">
          <Text className="font-strong text-[15px] text-ink">{task.title}</Text>
          <Text className="font-body text-[12px] text-mist">{formatClock(task.time)} • {task.durationMinutes} min</Text>
        </Card>
      ))}
      {routine ? (
        <Card onPress={() => router.push(`/routines/${routine.id}`)} className="mt-2">
          <Text className="font-body text-[12px] text-mist">Routine</Text>
          <Text className="font-strong text-[16px] text-ink">{routine.name}</Text>
          <Text className="font-body text-[13px] text-ink">{routineDone} of {routine.steps.length} steps complete</Text>
          <Text className="mt-1 font-strong text-[13px] text-sprout">Continue</Text>
        </Card>
      ) : null}
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 rounded-[20px] p-4" style={{ backgroundColor: "#FFF1B8" }}>
          <Text className="font-body text-[12px] text-mist">Points</Text>
          <Text className="font-strong text-[18px] text-ink">{user?.points ?? 0}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/progress/rewards")} className="flex-1 rounded-[20px] p-4" style={{ backgroundColor: "#E3F0DD" }}>
          <Text className="font-body text-[12px] text-mist">Next reward</Text>
          <Text className="font-body text-[13px] text-ink">{nextReward ? `${nextReward.points - (user?.points ?? 0)} points away` : rewards.length ? "All unlocked" : "No rewards yet"}</Text>
        </Pressable>
      </View>
      <View className="mt-4 flex-row items-center justify-between rounded-[20px] p-4" style={{ backgroundColor: "#F8D8CF" }}>
        <Text className="flex-1 pr-3 font-strong text-[15px] text-ink">Small steps make big days!</Text>
        <View pointerEvents="none"><SvgXml xml={dashboardArt.star} /></View>
      </View>
    </Screen>
  );
}
