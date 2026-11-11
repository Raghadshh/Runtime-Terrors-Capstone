/**
 * Rewards / Points (Figma screen 27).
 * Shows the family's real-life reward goals and the points needed to unlock each one.
 */
import { Fragment } from "react";
import { RedeemRewardButton } from "../points/RedeemRewardButton";
import { Button } from "@/components/button";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";

import { CheckIcon, LockIcon, StarIcon } from "@/components/icons";
import { Header } from "@/components/header";
import { Screen } from "@/components/screen";
import { useMine } from "@/lib/dashboard";
import { isRewardUnlocked, pointsUntilReward, rewardsByPoints } from "./rewardRules";

const rewardTints = ["#F5E0DB", "#E5EFF6", "#EAF2E6"];

export default function RewardsScreen({
  bottomBar,
  childView = false,
}: {
  bottomBar?: ReactNode;
  childView?: boolean;
}) {
  const router = useRouter();
  const mine = useMine();
  const rewards = mine.rewards ?? [];
  const rewardsError = mine.rewardsError;
  const balance = mine.user?.points ?? 0;
  const goals = rewardsByPoints(rewards);

  return (
    <Screen bottomBar={bottomBar}>
      <Header title="Rewards" />

      <View className="mb-4 rounded-[20px] px-5 py-4" style={{ backgroundColor: "#FCF2C8" }}>
        <Text className="font-body text-[11px] tracking-[1.5px] text-ink">YOUR BALANCE</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <StarIcon size={26} />
          <Text className="font-strong text-[28px] text-ink">{balance} points</Text>
        </View>
        <Text className="mt-2 font-body text-[12px] text-ink">Use your points to redeem rewards.</Text>
      </View>

      <Text className="mb-2 font-strong text-[14px] text-ink">Reward goals</Text>
      <View className="overflow-hidden rounded-[20px] bg-white">
        {goals.length === 0 ? (
          <Text className="px-4 py-6 font-body text-[13px] text-mist">
            No reward goals yet. Create one to give every small step a destination.
          </Text>
        ) : (
          goals.map((reward, index) => {
            const unlocked = isRewardUnlocked(reward, balance);
            const remaining = pointsUntilReward(reward, balance);
            return (
              <Fragment key={reward.id}>
                <Pressable
                  accessibilityRole={childView ? undefined : "button"}
                  accessibilityLabel={childView ? undefined : `Edit reward: ${reward.name}`}
                  accessibilityState={childView ? { disabled: true } : undefined}
                  disabled={childView}
                  onPress={childView ? undefined : () => router.push(`/progress/rewards/${reward.id}`)}
                  className={`flex-row items-center px-4 py-3 ${index < goals.length - 1 ? "border-b border-[#EDF3EE]" : ""}`}
                >
                  <View
                    className="h-[52px] w-[52px] items-center justify-center rounded-full"
                    style={{ backgroundColor: rewardTints[index % rewardTints.length] }}
                  >
                    <StarIcon size={23} />
                  </View>
                  <View className="ml-3 flex-1 pr-2">
                    <Text className="font-strong text-[15px] text-ink">{reward.name}</Text>
                    <Text className="mt-1 font-body text-[12px] text-mist">{reward.points} points</Text>
                    <Text className="mt-1 font-strong text-[12px] text-sprout">
                      {unlocked ? "Unlocked" : `${remaining} points to go`}
                    </Text>
                  </View>
                  {unlocked ? (
                    <View className="h-[26px] w-[26px] items-center justify-center rounded-full" style={{ backgroundColor: "#87B38F" }}>
                      <CheckIcon color="#FFFFFF" size={15} />
                    </View>
                  ) : (
                    <LockIcon size={18} color="#557186" />
                  )}
                </Pressable>
                <RedeemRewardButton key={`${reward.id}-${mine.child?.id ?? "self"}`} reward={reward} />
              </Fragment>
            );
          })
        )}
      </View>

      {mine.pointsLoading ? <Text className="mt-2 font-body text-[12px] text-mist">Updating points…</Text> : null}
      {mine.pointsError ? <View className="mt-3 gap-2">
        <Text accessibilityRole="alert" className="font-body text-[13px] text-[#9C4A4A]">Could not load points. {mine.pointsError}</Text>
        <Button label="Retry points" variant="secondary" onPress={() => void mine.reloadPoints()} />
      </View> : null}
      {(mine.redemptions ?? []).length > 0 ? <View className="mt-4 rounded-[20px] bg-white p-4">
        <Text className="font-strong text-[14px] text-ink">Recent redemptions</Text>
        {mine.redemptions.map(receipt => <View key={receipt.id} className="mt-3">
          <Text className="font-strong text-[13px] text-ink">{receipt.reward_name}</Text>
          <Text className="font-body text-[12px] text-mist">{receipt.points_spent} points · {new Date(receipt.redeemed_at).toLocaleDateString()}</Text>
        </View>)}
      </View> : null}

      {rewardsError ? (
        <Text className="mt-2 font-body text-[11px] text-[#9C4A4A]">
          Could not reach Supabase. Check the rewards migration and your connection.
        </Text>
      ) : null}

      {!childView ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/progress/rewards/new")}
          className="mt-4 h-[52px] items-center justify-center rounded-[16px]"
          style={{ backgroundColor: "#87B38F" }}
        >
          <Text className="font-strong text-[16px] text-white">Create Reward</Text>
        </Pressable>
      ) : null}

      <View className="mt-4 rounded-[20px] bg-white p-4">
        <Text className="font-strong text-[14px] text-ink">How points work</Text>
        <Text className="mt-1 font-body text-[12px] text-ink">
          Earn the points set on each completed task or routine.
        </Text>
      </View>

      <Pressable accessibilityRole="button" onPress={() => Alert.alert("Garden", "The garden is growing soon.")} className="mt-4 items-center py-2">
        <Text className="font-strong text-[14px] text-sprout">Visit Garden</Text>
      </Pressable>
    </Screen>
  );
}
