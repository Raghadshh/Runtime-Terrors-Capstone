import { Redirect, useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Text, View, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Svg, { Circle, Path, SvgXml } from "react-native-svg";
import { dashboardArt } from "@assets/illustration";
import { Button } from "@/components/button";
import { Header } from "@/components/header";
import { Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { useTasks } from "./TasksContext";
import { completionKey } from "./taskRules";
import { requireSupabase } from "../accounts/supabase";

export default function TaskCompleteScreen({ taskId: propsTaskId, childView = false }: { taskId?: string; childView?: boolean }) {
  const router = useRouter();
  const { child } = useMine();
  
  let params: { taskId?: string; id?: string } = {};
  try {
    params = useLocalSearchParams<{ taskId?: string; id?: string }>() || {};
  } catch {
    params = {};
  }
  
  const taskId = propsTaskId || params.taskId || params.id;
  
  const { tasks, done, today, loading } = useTasks();
  const task = tasks.find((item) => item.id === taskId);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  if (loading) return <Screen><Text>Loading…</Text></Screen>;
  const childHome = child ? `/child?id=${child.id}` : "/home";
  if (!task || !done.has(completionKey(taskId!, today))) {
    return <Redirect href={childView ? childHome : "/tasks"} />;
  }

  const requiresPhoto = Boolean(
    task.requiresPhoto || 
    (task as any).requires_photo
  );

  async function pickAndUploadPhoto() {
    if (!task) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
      setUploading(true);

      try {
        const supabase = requireSupabase();
        const response = await fetch(selectedUri);
        const blob = await response.blob();
        const fileName = `${task.id}_${Date.now()}.jpg`;

        const { data: storageData, error: uploadError } = await supabase.storage
          .from("completion_photos")
          .upload(fileName, blob, { contentType: "image/jpeg" });

        const photoUrl = uploadError ? selectedUri : storageData?.path;

        // Save completion photo URL and set status to pending for parent review
        await supabase
          .from("tasks")
          .update({ 
            completion_photo_url: photoUrl,
            approval_status: "pending" 
          })
          .eq("id", task.id);

        setUploaded(true);
      } catch (err) {
        console.error("Photo upload failed:", err);
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <Screen scroll={false}>
      <Header title="Task Complete" />
      <View style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: -28, right: -28, height: "44%" }}>
          <Svg width="100%" height="100%" viewBox="0 0 357 260" preserveAspectRatio="none">
            <Path d="M0 40 C100 -24 195 105 280 62 C310 48 333 32 357 20 V260 H0Z" fill="#E3F0DD" />
            <Path d="M0 88 C105 12 224 158 306 96 C330 79 345 64 357 53 V260 H0Z" fill="#B6DCAF" />
          </Svg>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 16 }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 16, top: "10%" }}>
            <SvgXml xml={dashboardArt.star} />
          </View>

          <Svg width={120} height={120} viewBox="0 0 154 154">
            <Circle cx={77} cy={77} r={77} fill="white" />
            <Circle cx={77} cy={77} r={61} fill="#65A878" />
            <Path d="M48 78 L68 98 L108 55" stroke="white" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>

          <Text className="mt-3 text-center font-strong text-[26px] text-ink">Nice job!</Text>
          <Text className="mt-1 text-center font-body text-[15px] text-ink">{task.title} is complete.</Text>

          {requiresPhoto ? (
            <View className="mt-4 items-center w-full px-6">
              {imageUri ? (
                <View className="items-center">
                  <Image source={{ uri: imageUri }} style={{ width: 140, height: 140, borderRadius: 16, marginBottom: 8 }} />
                  {uploading ? (
                    <ActivityIndicator color="#65A878" />
                  ) : uploaded ? (
                    <Text className="font-strong text-[14px] text-[#65A878]">✓ Photo attached!</Text>
                  ) : null}
                </View>
              ) : (
                <View className="rounded-xl bg-[#E8F1F2] p-3 border border-[#B3D4D8] items-center w-full">
                  <Text className="font-strong text-[14px] text-[#2C5E69]"> Your parent asked for a picture</Text>
                  <Text className="mt-1 text-center font-body text-[12px] text-gray-500">
                    Upload a picture to confirm task completion.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="mt-4 flex-row items-center gap-2 rounded-full px-4 py-2" style={{ backgroundColor: "#FFF1B8" }}>
              <SvgXml xml={dashboardArt.star} />
              <Text className="font-strong text-[14px] text-ink">{task.points} points</Text>
            </View>
          )}
        </View>

        <View className="gap-3 pb-6 pt-2 px-4">
          {requiresPhoto && !uploaded ? (
            <Button
              label={imageUri ? "Change Picture" : "Upload Picture"}
              onPress={() => void pickAndUploadPhoto()}
            />
          ) : null}

          <Button
            label={childView ? "Back to Today" : "Back to Tasks"}
            variant={requiresPhoto && !uploaded ? "secondary" : "primary"}
            onPress={() => router.replace(childView ? childHome : "/tasks")}
          />
          {!childView ? (
            <Button label="Go Home" variant="secondary" onPress={() => router.replace("/home")} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}