import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import Svg, { Circle, Path, SvgXml } from "react-native-svg";
import { dashboardArt } from "@assets/illustration";
import { Button } from "@/components/button";
import { Header } from "@/components/header";
import { Screen } from "@/components/screen";
import { useTasks } from "./TasksContext";
import { completionKey } from "./taskRules";

export default function TaskCompleteScreen({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { tasks, done, today, loading } = useTasks();
  const task = tasks.find(item => item.id === taskId);
  if (loading) return <Screen><Text>Loading…</Text></Screen>;
  if (!task || !done.has(completionKey(taskId, today))) return <Redirect href="/tasks" />;

  return <Screen scroll={false}>
    <Header title="Task Complete" />
    <View style={{ flex: 1 }}>
      <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: -28, right: -28, height: "44%" }}>
        <Svg width="100%" height="100%" viewBox="0 0 357 260" preserveAspectRatio="none">
          <Path d="M0 40 C100 -24 195 105 280 62 C310 48 333 32 357 20 V260 H0Z" fill="#E3F0DD" />
          <Path d="M0 88 C105 12 224 158 306 96 C330 79 345 64 357 53 V260 H0Z" fill="#B6DCAF" />
          <Path d="M45 96 C28 93 22 83 25 73 C38 73 42 82 41 88 C44 78 47 66 57 62 C64 75 53 85 45 89Z" fill="#65A878" />
          <Path d="M307 69 C294 63 291 55 296 46 C307 49 309 55 309 60 C312 49 318 45 327 45 C325 58 317 66 307 69Z" fill="#65A878" />
        </Svg>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 24 }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 16, top: "13%" }}><SvgXml xml={dashboardArt.star} /></View>
        <View pointerEvents="none" style={{ position: "absolute", right: 12, top: "23%", transform: [{ scale: 0.7 }] }}><SvgXml xml={dashboardArt.star} /></View>
        <Svg width={154} height={154} viewBox="0 0 154 154" accessibilityLabel="Completed">
          <Circle cx={77} cy={77} r={77} fill="white" /><Circle cx={77} cy={77} r={61} fill="#65A878" />
          <Path d="M48 78 L68 98 L108 55" stroke="white" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Text className="mt-4 text-center font-strong text-[28px] text-ink">Nice job!</Text>
        <Text className="mt-2 text-center font-body text-[15px] text-ink">{task.title} is complete.</Text>
        <View className="mt-5 flex-row items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: "#FFF1B8" }}>
          <SvgXml xml={dashboardArt.star} /><Text className="font-strong text-[14px] text-ink">{task.points} points</Text>
        </View>
      </View>
      <View className="gap-3 pb-6 pt-3">
        <Button label="Back to Tasks" onPress={() => router.replace("/tasks")} />
        <Button label="Go Home" variant="secondary" onPress={() => router.replace("/home")} />
      </View>
    </View>
  </Screen>;
}
