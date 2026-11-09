/**
- Completion Review Screen (Figma Screen 41)
- Parent inspects the submitted photo, leaves optional feedback, and approves or requests changes.
 */
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View, TextInput, Image, ScrollView } from "react-native";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { useTasks } from "./TasksContext";
import { requireSupabase } from "../accounts/supabase";

export default function CompletionReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, reload, setDone, today } = useTasks();
  const task = tasks.find((t) => t.id === id);

  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    if (!task) return;
    setSubmitting(true);
    try {
      const client = requireSupabase();
      
      // Update only the approval status in Supabase
      const { error } = await client
        .from("tasks")
        .update({
          approval_status: "approved",
        })
        .eq("id", task.id);

      if (error) throw new Error(error.message);

      // Mark the task done for today so it registers completion points & check state
      await setDone(task.id, today, true);

      await reload();
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestChanges() {
    if (!task) return;
    setSubmitting(true);
    try {
      const client = requireSupabase();
      
      // Update approval status to 'changes' requesting a resubmission
      const { error } = await client
        .from("tasks")
        .update({
          approval_status: "changes",
        })
        .eq("id", task.id);

      if (error) throw new Error(error.message);

      await reload();
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (!task) {
    return (
      <Screen>
        <Header title="Completion Review" />
        <Text className="font-body text-[15px] text-ink">Task not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Completion Review" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mb-4 rounded-[16px] bg-white p-4">
          <Text className="font-strong text-[18px] text-ink">{task.title}</Text>
          <Text className="mt-1 font-body text-[12px] text-mist">Completed today • {task.points} points</Text>
        </View>

        <Text className="mb-2 font-strong text-[14px] text-ink">Completion photo</Text>
        <View className="mb-4 overflow-hidden rounded-[20px] border border-sage bg-white">
          {task.completionPhotoUrl ? (
            <Image source={{ uri: task.completionPhotoUrl }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
          ) : (
            <View className="h-[200px] items-center justify-center bg-[#F9FCF8]">
              <Text className="font-body text-[14px] text-mist">No photo provided</Text>
            </View>
          )}
        </View>

        <Text className="mb-2 font-strong text-[14px] text-ink">Parent feedback (optional)</Text>
        <TextInput
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Leave a note for your child..."
          placeholderTextColor="#8A9AA2"
          multiline
          numberOfLines={3}
          className="mb-6 rounded-[16px] border border-sage bg-white p-4 font-body text-[14px] text-ink"
        />

        <View className="gap-3">
          <Button
            label={submitting ? "Saving..." : "✓ Approve"}
            disabled={submitting}
            onPress={() => void handleApprove()}
          />
          <Button
            label="Not yet • Needs changes"
            variant="secondary"
            disabled={submitting}
            onPress={() => void handleRequestChanges()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}