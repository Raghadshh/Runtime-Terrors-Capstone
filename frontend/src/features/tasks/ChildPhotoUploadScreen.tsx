/**
 * Child Photo Upload Screen (Figma 18B / photo upload flow)
 * Allows child to select/attach a completion photo and submit it for parent review.
 */
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View, Pressable, Image, TextInput } from "react-native";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { useTasks } from "./TasksContext";
import { requireSupabase } from "../accounts/supabase";

export default function ChildPhotoUploadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, reload } = useTasks();
  const task = tasks.find((t) => t.id === id);

  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitPhoto() {
    if (!task || !photoUrl.trim()) return;
    setSubmitting(true);
    try {
      const client = requireSupabase();
      
      // Update task completion status to pending review & store the photo URL
      const { error } = await client
        .from("tasks")
        .update({
          approval_status: "pending",
          completion_photo_url: photoUrl.trim(),
        })
        .eq("id", task.id);

      if (error) throw new Error(error.message);

      await reload();
      router.replace({ pathname: "/tasks", params: { tab: "Today" } });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Header title="Upload Completion Photo" />
      <View className="my-4 rounded-[20px] bg-white p-4">
        <Text className="font-strong text-[18px] text-ink">{task?.title}</Text>
        <Text className="mt-1 font-body text-[13px] text-mist">Your parent requires a photo review for this task.</Text>
      </View>

      {photoUrl ? (
        <View className="my-3 overflow-hidden rounded-[20px] border border-sage bg-white">
          <Image source={{ uri: photoUrl }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
        </View>
      ) : null}

      <View className="my-3">
        <Text className="mb-2 font-strong text-[14px] text-ink">Photo URL or Image Link</Text>
        <TextInput
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="Paste image URL here..."
          placeholderTextColor="#8A9AA2"
          className="rounded-[14px] border border-sage bg-white px-4 py-3 font-body text-[14px] text-ink"
        />
      </View>

      <View className="mt-6 gap-3">
        <Button
          label={submitting ? "Sending..." : "Submit for Approval"}
          disabled={!photoUrl.trim() || submitting}
          onPress={() => void handleSubmitPhoto()}
        />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}