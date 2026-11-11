import type { Reward, RewardDraft } from '@/lib/types';

/**
 * Real-life reward goals shown on the parent progress and rewards screens.
 * An empty `childIds` list means the reward is available to everyone in the family.
 */
export const presetRewards: Reward[] = [
  { id: 'reward_dinner', userId: '', childId: null, childIds: [], name: 'Choose dinner', points: 80, description: 'Pick what is for dinner' },
  { id: 'reward_game', userId: '', childId: null, childIds: [], name: 'Extra game time', points: 150, description: '30 extra minutes of screen time' },
  { id: 'reward_movie', userId: '', childId: null, childIds: [], name: 'Movie night', points: 200, description: 'Pick a movie for family night' },
];

export function presetRewardsFor(userId: string): Reward[] {
  return presetRewards.map(reward => ({ ...reward, userId }));
}

/** Children who can redeem a reward. An empty list means everyone. */
export function rewardChildIds(reward: Reward): string[] {
  if (reward.childIds !== undefined) return reward.childIds;
  return reward.childId ? [reward.childId] : [];
}

/** Whether a reward is available to the given child (or to everyone). */
export function rewardAppliesToChild(reward: Reward, childId: string | null): boolean {
  const targetIds = rewardChildIds(reward);
  return targetIds.length === 0 || (!!childId && targetIds.includes(childId));
}

/** Human-readable summary for the selected reward audience. */
export function rewardAudienceLabel(reward: Reward, childNames: Record<string, string> = {}): string {
  const targetIds = rewardChildIds(reward);
  if (targetIds.length === 0) return 'Everyone';
  const names = targetIds.map(id => childNames[id]).filter(Boolean);
  if (names.length === 0) return targetIds.length === 1 ? '1 child' : `${targetIds.length} children`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export function rewardsByPoints(rewards: Reward[]): Reward[] {
  return [...rewards].sort((a, b) => a.points - b.points);
}

export function nextReward(rewards: Reward[], points: number): Reward | null {
  return rewardsByPoints(rewards).find(reward => reward.points > points) ?? null;
}

export function pointsUntilReward(reward: Reward, points: number): number {
  return Math.max(0, reward.points - points);
}

export function isRewardUnlocked(reward: Reward, points: number): boolean {
  return points >= reward.points;
}

export function rewardProgressPercent(reward: Reward, points: number): number {
  if (reward.points <= 0) return 100;
  return Math.min(100, Math.round((points / reward.points) * 100));
}

export function validateRewardDraft(draft: RewardDraft): string | null {
  const name = draft.name.trim();
  if (!name) return 'Enter a reward name.';
  if (name.length > 60) return 'Keep the reward name under 60 characters.';
  if (!Number.isInteger(draft.points) || draft.points < 1) return 'Enter a whole number of points greater than 0.';
  if (draft.points > 100000) return 'Keep the points under 100,000.';
  if (draft.description.trim().length > 160) return 'Keep the description under 160 characters.';
  if (draft.childIds.some(childId => !childId)) return 'Choose valid child profiles.';
  if (new Set(draft.childIds).size !== draft.childIds.length) return 'Choose each child only once.';
  return null;
}
