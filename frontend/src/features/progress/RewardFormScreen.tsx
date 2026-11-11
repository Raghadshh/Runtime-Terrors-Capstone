/**
 * Create or edit a real-life reward (Figma screen 28).
 * Saves through the rewards table in Supabase.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { Header } from "@/components/header";
import { StarIcon } from "@/components/icons";
import { FormError, Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import type { Reward } from "@/lib/types";
import { rewardChildIds, validateRewardDraft } from "./rewardRules";

interface RewardFormScreenProps {
  rewardId?: string;
  bottomBar?: ReactNode;
}

export default function RewardFormScreen({ rewardId, bottomBar }: RewardFormScreenProps) {
  const mine = useMine();
  const rewards = mine.rewards ?? [];
  const original = rewardId ? rewards.find(reward => reward.id === rewardId) : undefined;

  if (rewardId && !original && mine.rewardsLoading) {
    return (
      <Screen bottomBar={bottomBar}>
        <Header title="Edit Reward" />
        <Text className="font-body text-[14px] text-mist">Loading reward…</Text>
      </Screen>
    );
  }

  if (rewardId && !original) {
    return (
      <Screen bottomBar={bottomBar}>
        <Header title="Edit Reward" />
        <Text className="font-body text-[14px] text-mist">This reward was not found.</Text>
      </Screen>
    );
  }

  return <RewardForm key={rewardId ?? "new"} rewardId={rewardId} original={original} bottomBar={bottomBar} />;
}

function RewardForm({ rewardId, original, bottomBar }: { rewardId?: string; original?: Reward; bottomBar?: ReactNode }) {
  const router = useRouter();
  const mine = useMine();
  const child = mine.child;
  const children = mine.children ?? [];
  const user = mine.user;
  const parent = user?.accountType === "parent";

  const startingChildIds = original ? rewardChildIds(original) : parent && child ? [child.id] : [];

  const [name, setName] = useState(original?.name ?? "");
  const [pointsText, setPointsText] = useState(original ? String(original.points) : "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [forEveryone, setForEveryone] = useState(startingChildIds.length === 0);
  const [forChildIds, setForChildIds] = useState<string[]>(startingChildIds);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!original) return;
    const targetIds = rewardChildIds(original);
    setName(original.name);
    setPointsText(String(original.points));
    setDescription(original.description);
    setForEveryone(targetIds.length === 0);
    setForChildIds(targetIds);
  }, [original?.id]);

  const points = Number(pointsText);
  const previewPoints = Number.isFinite(points) && points > 0 ? points : 0;

  function toggleChild(id: string) {
    setForEveryone(false);
    setForChildIds(current =>
      current.includes(id) ? current.filter(childId => childId !== id) : [...current, id],
    );
  }

  function chooseEveryone() {
    setForEveryone(true);
    setForChildIds([]);
  }

  async function save() {
    if (busy) return;
    if (!forEveryone && forChildIds.length === 0) {
      setError("Choose at least one child, or select Everyone.");
      return;
    }
    const draft = {
      name,
      points: Number(pointsText),
      description,
      childIds: forEveryone ? [] : forChildIds,
    };
    const validation = validateRewardDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mine.saveReward(draft, rewardId);
      router.replace("/progress/rewards");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this reward.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!rewardId) return;
    Alert.alert("Delete reward", `Remove “${original?.name ?? "this reward"}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              await mine.removeReward(rewardId);
              router.replace("/progress/rewards");
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not delete this reward.");
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  return (
    <Screen bottomBar={bottomBar}>
      <Header title={rewardId ? "Edit Reward" : "Create Reward"} />

      <View className="gap-3">
        <RewardField label="Reward name" value={name} onChangeText={setName} placeholder="Movie night" maxLength={60} />
        <RewardField
          label="Points needed"
          value={pointsText}
          onChangeText={setPointsText}
          placeholder="200 points"
          keyboardType="number-pad"
          maxLength={6}
        />
        <RewardField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Pick a movie for family night"
          maxLength={160}
          multiline
        />

        <Text className="mt-1 font-body text-[12px] text-ink">For</Text>
        <View className="gap-2">
          {parent
            ? children.map(profile => {
                const selected = !forEveryone && forChildIds.includes(profile.id);
                return (
                  <ForCard
                    key={profile.id}
                    label={profile.name}
                    caption={selected ? "Selected" : "Just for them"}
                    selected={selected}
                    onPress={() => toggleChild(profile.id)}
                  />
                );
              })
            : null}
          <ForCard
            label="Everyone"
            caption={forEveryone ? "Selected" : "Shared reward"}
            selected={forEveryone}
            onPress={chooseEveryone}
          />
        </View>

        <Text className="mt-1 font-body text-[12px] text-ink">Reward preview</Text>
        <View className="flex-row items-center rounded-[20px] px-4 py-4" style={{ backgroundColor: "#FCF2C8" }}>
          <StarIcon size={28} />
          <View className="ml-3 flex-1">
            <Text className="font-strong text-[16px] text-ink">{name.trim() || "Your reward"}</Text>
            <Text className="mt-1 font-body text-[12px] text-ink">Unlocks at {previewPoints} points</Text>
          </View>
        </View>

        <FormError message={error} />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void save()}
          className={`mt-1 h-[52px] items-center justify-center rounded-[16px] ${busy ? "opacity-50" : "active:opacity-80"}`}
          style={{ backgroundColor: "#86B38E" }}
        >
          <Text className="font-strong text-[16px] text-white">{busy ? "Saving…" : "Save Reward"}</Text>
        </Pressable>

        {rewardId ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={confirmDelete}
            className="h-[52px] items-center justify-center rounded-[16px] bg-white"
          >
            <Text className="font-strong text-[15px] text-[#B65C56]">Delete Reward</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

function RewardField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View className={`w-full rounded-[20px] bg-white px-4 ${multiline ? "min-h-[96px] py-3" : "h-[70px] py-3"}`}>
      <Text className="font-body text-[11px] text-mist">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#718897"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`mt-1 p-0 font-strong text-[16px] text-ink ${multiline ? "min-h-[52px]" : ""}`}
      />
    </View>
  );
}

function ForCard({
  label,
  caption,
  selected,
  onPress,
}: {
  label: string;
  caption: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-[18px] bg-white px-4 py-3 ${selected ? "border-[1.5px] border-leaf" : ""}`}
    >
      <Text className="font-strong text-[14px] text-ink">{label}</Text>
      <Text className={`mt-1 font-body text-[11px] ${selected ? "text-sprout" : "text-mist"}`}>{caption}</Text>
    </Pressable>
  );
}
