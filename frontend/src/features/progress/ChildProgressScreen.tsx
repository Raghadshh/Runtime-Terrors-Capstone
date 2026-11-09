/**
 * Child Progress Screen for Parents (Figma Screen 38 & 39)
 * Full-screen encouragement modal with dynamic history tracking.
 */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View, ScrollView, Modal, TextInput, Pressable } from "react-native";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { ProgressBar } from "@/components/progress";
import { useMine } from "@/lib/dashboard";

export default function ChildProgressScreen() {
  const router = useRouter();
  const { child, tasks, routines } = useMine();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'nice' | 'keep' | 'proud'>('nice');
  const [message, setMessage] = useState('You stayed focused on your routine today.\nThat was a strong effort.');
  
  // Dynamic history state that updates live when you send encouragement
  const [history, setHistory] = useState([
    { text: "“Nice work on your morning routine.”", time: "Sent yesterday at 7:30 AM", bgClass: "bg-[#E6F0E4]" },
    { text: "“Keep going — one step at a time.”", time: "Sent Monday at 4:10 PM", bgClass: "bg-[#E4EFE4]" },
  ]);

  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasksCount = Math.max(tasks.length, 30);
  const taskPercent = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

  const completedRoutinesCount = routines.filter((r) => r.status === "complete").length;
  const inProgressRoutinesCount = routines.filter((r) => r.status === "active" || r.status === "ready").length;

  const currentPoints = 170;
  const targetPoints = 200;
  const rewardPercent = Math.min(100, Math.round((currentPoints / targetPoints) * 100));
  const activeRewardName = "Movie Night";
  const pointsNeeded = Math.max(0, targetPoints - currentPoints);

  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  
  const weeklyBars = daysOfWeek.map((dayLabel, index) => {
    const dayCompletedCount = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const taskDayIndex = new Date(t.completedAt).getDay();
      const adjustedIndex = taskDayIndex === 0 ? 6 : taskDayIndex - 1;
      return adjustedIndex === index;
    }).length;

    const calculatedHeight = Math.min(Math.max(dayCompletedCount * 15, 25), 90);

    return {
      day: dayLabel,
      height: calculatedHeight,
      count: dayCompletedCount,
    };
  });

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
    <Screen>
      <Header title="Child Progress" />
      
      {/* Selected Child Header Card with Compact Change Button */}
      <View className="mb-4 flex-row items-center justify-between rounded-[16px] bg-white p-4 shadow-sm">
        <View>
          <Text className="font-body text-[11px] text-mist">Selected child</Text>
          <Text className="font-strong text-[18px] text-ink">{child?.name ?? "Alex"}</Text>
        </View>
        <View className="w-[100px]">
          <Button label="Change" variant="secondary" onPress={() => router.push("/choose-child")} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="mb-2 font-strong text-[14px] text-ink">This week</Text>
        <View className="mb-4 flex-row gap-3">
          <Card className="flex-1">
            <Text className="font-strong text-[11px] text-mist">TASKS COMPLETE</Text>
            <Text className="my-1 font-strong text-[22px] text-ink">{completedTasksCount} / {totalTasksCount}</Text>
            <Text className="font-body text-[11px] text-sprout">{taskPercent}% completed</Text>
          </Card>
          <Card className="flex-1">
            <Text className="font-strong text-[11px] text-mist">ROUTINES</Text>
            <Text className="my-1 font-strong text-[22px] text-ink">{completedRoutinesCount} / 14</Text>
            <Text className="font-body text-[11px] text-mist">{inProgressRoutinesCount} in progress</Text>
          </Card>
        </View>

        {/* Reward Progress Card */}
        <Card className="mb-4">
          <Text className="font-strong text-[13px] text-ink">Reward progress</Text>
          <View className="my-2">
            <ProgressBar percent={rewardPercent} />
          </View>
          <Text className="font-body text-[12px] text-mist">
            {currentPoints} / {targetPoints} points • {pointsNeeded} points until {activeRewardName}
          </Text>
        </Card>

        {/* Weekly Activity Bars Card */}
        <Card className="mb-4">
          <Text className="mb-4 font-strong text-[13px] text-ink">Weekly activity</Text>
          <View className="flex-row items-end justify-between px-2 pt-4" style={{ height: 110 }}>
            {weeklyBars.map((bar, idx) => (
              <View key={idx} className="items-center">
                <View 
                  className="w-7 rounded-t-[6px]" 
                  style={{ height: bar.height, backgroundColor: "#6A9A78" }} 
                />
                <Text className="mt-2 font-strong text-[11px] text-mist">{bar.day}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Send Encouragement Action */}
        <View className="mt-2">
          <Button label="Send Encouragement" onPress={() => setModalVisible(true)} />
        </View>
      </ScrollView>

      {/* Full-Screen Encouragement Modal (Figma Screen 39) */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <Screen>
          <Header title="Send Encouragement" />
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
            {/* Top Bar with Close */}
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 rounded-[16px] bg-white p-4 shadow-sm">
                <Text className="font-body text-[11px] text-mist">Selected child</Text>
                <Text className="font-strong text-[18px] text-ink">{child?.name ?? "Alex"}</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} className="ml-3 p-2">
                <Text className="font-strong text-[15px] text-mist">Close</Text>
              </Pressable>
            </View>

            {/* Choose Encouragement Cards */}
            <Card className="mb-4">
              <Text className="mb-3 font-strong text-[13px] text-ink">Choose encouragement</Text>
              <View className="flex-row gap-2">
                <Pressable 
                  onPress={() => {
                    setSelectedType('nice');
                    setMessage('Nice work on your routine today!');
                  }}
                  className={`flex-1 rounded-[14px] p-3 items-center ${selectedType === 'nice' ? 'border-[1.5px] border-leaf bg-[#FFFCEB]' : 'border border-mist/30 bg-white'}`}
                >
                  <Text className="font-strong text-ink text-[12px]">Nice work</Text>
                  <Text className="text-[10px] text-mist">Warm praise</Text>
                </Pressable>
                <Pressable 
                  onPress={() => {
                    setSelectedType('keep');
                    setMessage('Keep going — one step at a time.');
                  }}
                  className={`flex-1 rounded-[14px] p-3 items-center ${selectedType === 'keep' ? 'border-[1.5px] border-leaf bg-[#FFFCEB]' : 'border border-mist/30 bg-white'}`}
                >
                  <Text className="font-strong text-ink text-[12px]">Keep going</Text>
                  <Text className="text-[10px] text-mist">Supportive</Text>
                </Pressable>
                <Pressable 
                  onPress={() => {
                    setSelectedType('proud');
                    setMessage('Proud of you! Excellent effort.');
                  }}
                  className={`flex-1 rounded-[14px] p-3 items-center ${selectedType === 'proud' ? 'border-[1.5px] border-leaf bg-[#FFFCEB]' : 'border border-mist/30 bg-white'}`}
                >
                  <Text className="font-strong text-ink text-[12px]">Proud of you</Text>
                  <Text className="text-[10px] text-mist">Celebrate</Text>
                </Pressable>
              </View>
            </Card>

            {/* Optional Message Card */}
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

            {/* Send Button */}
            <View className="mb-6">
              <Button label={`Send to ${child?.name ?? "Alex"}`} onPress={handleSend} />
            </View>

            {/* Recent Encouragement History Section */}
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