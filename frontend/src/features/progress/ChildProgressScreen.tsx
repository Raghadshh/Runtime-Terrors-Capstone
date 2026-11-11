/**
 * Parent progress overview (Figma screen 26) with the reward goal shortcut.
 * The encouragement composer from Figma screens 38 & 39 stays available from the header.
 */
import { useState, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { CheckIcon, StarIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { nextReward, pointsUntilReward } from "@/features/progress/rewardRules";

export default function ChildProgressScreen({ bottomBar }: { bottomBar?: ReactNode }) {
  const router = useRouter();
  const mine = useMine();
  const child = mine.child;
  const tasks = mine.tasks ?? [];
  const routines = mine.routines ?? [];
  const rewards = mine.rewards ?? [];
  const points = mine.user?.points ?? 0;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<"nice" | "keep" | "proud">("nice");
  const [message, setMessage] = useState("You stayed focused on your routine today.\nThat was a strong effort.");

  // Dynamic history state that updates live when you send encouragement.
  const [history, setHistory] = useState([
    { text: "“Nice work on your morning routine.”", time: "Sent yesterday at 7:30 AM", bgClass: "bg-[#E6F0E4]" },
    { text: "“Keep going — one step at a time.”", time: "Sent Monday at 4:10 PM", bgClass: "bg-[#E4EFE4]" },
  ]);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasksCount = tasks.length;
  const completedRoutinesCount = routines.filter((r) => r.status === "complete").length;
  const activeRoutinesCount = routines.filter((r) => r.status === "active" || r.status === "ready").length;

  const goal = nextReward(rewards, points);
  const pointsNeeded = goal ? pointsUntilReward(goal, points) : 0;

  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const weeklyBars = daysOfWeek.map((dayLabel, index) => {
    const dayCompletedCount = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const taskDayIndex = new Date(t.completedAt).getDay();
      const adjustedIndex = taskDayIndex === 0 ? 6 : taskDayIndex - 1;
      return adjustedIndex === index;
    }).length;
    return {
      day: dayLabel,
      height: Math.min(Math.max(dayCompletedCount * 15, 25), 90),
      count: dayCompletedCount,
    };
  });

  const completedTaskWithTime = [...tasks]
    .filter((task) => task.completed && task.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))[0];
  const completedRoutine = routines.find((routine) => routine.status === "complete");
  const recentTitle = completedTaskWithTime
    ? `${completedTaskWithTime.title} completed`
    : completedRoutine
      ? `${completedRoutine.name} completed`
      : "No progress logged yet";
  const recentTime = completedTaskWithTime?.completedAt
    ? `Today at ${new Date(completedTaskWithTime.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : "Today";

  const streak = Math.max(1, new Set(tasks.filter(t => t.completedAt).map(t => new Date(t.completedAt!).toDateString())).size);
  const taskSummary = completedTasksCount === 1 ? "1 task completed" : `${completedTasksCount} tasks completed`;
  const routineSummary = routines.length === 0 ? "No routines yet" : `${activeRoutinesCount} in progress`;

  const handleSend = () => {
    const newEntry = {
      text: `“${message}”`,
      time: "Just now",
      bgClass: "bg-[#E6F0E4]",
    };
    setHistory([newEntry, ...history]);
    setModalVisible(false);
  };

  return (
    <Screen bottomBar={bottomBar}>
      <Header title="Progress" right="Encourage" onRight={() => setModalVisible(true)} />

      <View className="mb-3 overflow-hidden rounded-[20px] px-5 py-5" style={{ backgroundColor: "#E5EFF6" }}>
        <Text className="font-body text-[11px] tracking-[1.5px] text-ink">THIS WEEK</Text>
        <Text className="mt-2 font-strong text-[20px] leading-[27px] text-ink">
          You're building momentum {"\n"}{streak} day streak
        </Text>
        <Text className="mt-2 font-body text-[13px] text-ink">{taskSummary}</Text>
      </View>

      <View className="mb-3 flex-row gap-3">
        <View className="flex-1 rounded-[20px] bg-white p-4">
          <Text className="font-body text-[12px] text-ink">Tasks today</Text>
          <Text className="mt-2 font-strong text-[23px] text-ink">{completedTasksCount}/{totalTasksCount}</Text>
        </View>
        <View className="flex-1 rounded-[20px] bg-white p-4">
          <Text className="font-body text-[12px] text-ink">Routines</Text>
          <Text className="mt-2 font-strong text-[23px] text-ink">{completedRoutinesCount}/{routines.length}</Text>
          <Text className="mt-1 font-body text-[11px] text-mist">{routineSummary}</Text>
        </View>
      </View>

      <Card className="mb-3">
        <Text className="font-strong text-[13px] text-ink">Weekly activity</Text>
        <View className="flex-row items-end justify-between px-2 pt-5" style={{ height: 116 }}>
          {weeklyBars.map((bar, idx) => (
            <View key={idx} className="items-center">
              <View className="w-[26px] rounded-t-[6px]" style={{ height: bar.height, backgroundColor: "#6A9A78" }} />
              <Text className="mt-2 font-strong text-[11px] text-mist">{bar.day}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text className="mb-2 font-strong text-[14px] text-ink">Recent progress</Text>
      <View className="mb-3 flex-row items-center rounded-[20px] px-4 py-3" style={{ backgroundColor: "#EAF2E6" }}>
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
          <CheckIcon size={16} />
        </View>
        <View className="flex-1">
          <Text className="font-strong text-[14px] text-ink">{recentTitle}</Text>
          <Text className="mt-1 font-body text-[11px] text-mist">{recentTime}</Text>
        </View>
      </View>

      <View className="mb-4 flex-row items-center rounded-[20px] px-4 py-3" style={{ backgroundColor: "#F5E0DB" }}>
        <StarIcon size={22} />
        <View className="ml-3 flex-1">
          <Text className="font-strong text-[14px] text-ink">
            {goal ? "Reward goal is close" : "All reward goals unlocked"}
          </Text>
          <Text className="mt-1 font-body text-[12px] text-ink">
            {goal ? `${pointsNeeded} points to ${goal.name}` : `${points} points earned`}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/progress/rewards")}
          className="h-11 flex-1 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: "#E9F1E5", borderWidth: 1, borderColor: "#BCD0BB" }}
        >
          <Text className="font-strong text-[14px] text-ink">View Rewards</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert("Garden", "The garden is growing soon.")}
          className="h-11 flex-1 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: "#E5EFF5", borderWidth: 1, borderColor: "#BCD0BB" }}
        >
          <Text className="font-strong text-[14px] text-ink">Visit Garden</Text>
        </Pressable>
      </View>

      {/* Full-screen encouragement composer (Figma Screen 39). */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <Screen>
          <Header title="Send Encouragement" />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 rounded-[16px] bg-white p-4 shadow-sm">
                <Text className="font-body text-[11px] text-mist">Selected child</Text>
                <Text className="font-strong text-[18px] text-ink">{child?.name ?? "Alex"}</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} className="ml-3 p-2">
                <Text className="font-strong text-[15px] text-mist">Close</Text>
              </Pressable>
            </View>

            <Card className="mb-4">
              <Text className="mb-3 font-strong text-[13px] text-ink">Choose encouragement</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    setSelectedType("nice");
                    setMessage("Nice work on your routine today!");
                  }}
                  className={`flex-1 items-center rounded-[14px] p-3 ${selectedType === "nice" ? "border-[1.5px] border-leaf bg-[#FFFCEB]" : "border border-mist/30 bg-white"}`}
                >
                  <Text className="font-strong text-[12px] text-ink">Nice work</Text>
                  <Text className="text-[10px] text-mist">Warm praise</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedType("keep");
                    setMessage("Keep going — one step at a time.");
                  }}
                  className={`flex-1 items-center rounded-[14px] p-3 ${selectedType === "keep" ? "border-[1.5px] border-leaf bg-[#FFFCEB]" : "border border-mist/30 bg-white"}`}
                >
                  <Text className="font-strong text-[12px] text-ink">Keep going</Text>
                  <Text className="text-[10px] text-mist">Supportive</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedType("proud");
                    setMessage("Proud of you! Excellent effort.");
                  }}
                  className={`flex-1 items-center rounded-[14px] p-3 ${selectedType === "proud" ? "border-[1.5px] border-leaf bg-[#FFFCEB]" : "border border-mist/30 bg-white"}`}
                >
                  <Text className="font-strong text-[12px] text-ink">Proud of you</Text>
                  <Text className="text-[10px] text-mist">Celebrate</Text>
                </Pressable>
              </View>
            </Card>

            <Card className="mb-4">
              <Text className="mb-2 font-strong text-[13px] text-ink">Optional message</Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                maxLength={120}
                className="h-24 rounded-[12px] border border-mist/30 bg-white p-3 font-body text-[14px] text-ink"
                textAlignVertical="top"
              />
              <Text className="mt-1 text-right font-body text-[11px] text-mist">{message.length} / 120</Text>
            </Card>

            <View className="mb-6">
              <Button label={`Send to ${child?.name ?? "Alex"}`} onPress={handleSend} />
            </View>

            <Text className="mb-3 font-strong text-[14px] text-ink">Recent encouragement</Text>
            <View className="gap-3">
              {history.map((item, index) => (
                <View key={index} className={`rounded-[16px] p-4 ${item.bgClass}`}>
                  <Text className="font-strong text-[14px] text-ink">{item.text}</Text>
                  <Text className="mt-1 font-body text-[11px] text-mist">{item.time}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}
