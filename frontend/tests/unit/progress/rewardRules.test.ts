/**
 * Unit tests for the preset reward goals and reward calculations.
 */
import {
  isRewardUnlocked,
  nextReward,
  pointsUntilReward,
  presetRewards,
  presetRewardsFor,
  rewardAppliesToChild,
  rewardAudienceLabel,
  rewardChildIds,
  rewardProgressPercent,
  rewardsByPoints,
  validateRewardDraft,
} from '../../../src/features/progress/rewardRules';

const userId = 'parent-1';

describe('preset reward goals', () => {
  test('the presets match the Figma reward list', () => {
    expect(presetRewards.map(reward => [reward.name, reward.points])).toEqual([
      ['Choose dinner', 80],
      ['Extra game time', 150],
      ['Movie night', 200],
    ]);
  });

  test('presets are tagged with the signed-in parent and available to everyone', () => {
    const rewards = presetRewardsFor(userId);
    expect(rewards.every(reward => reward.userId === userId && reward.childIds?.length === 0)).toBe(true);
  });

  test('rewards sort from cheapest to most expensive', () => {
    expect(rewardsByPoints(presetRewardsFor(userId)).map(reward => reward.points)).toEqual([80, 150, 200]);
  });
});

describe('reward audiences', () => {
  const reward = { ...presetRewards[0], childIds: ['c1', 'c2'] };

  test('an empty child list means everyone can redeem the reward', () => {
    expect(rewardChildIds(presetRewards[0])).toEqual([]);
    expect(rewardAppliesToChild(presetRewards[0], 'c1')).toBe(true);
    expect(rewardAudienceLabel(presetRewards[0])).toBe('Everyone');
  });

  test('a reward can be shared with a subset of children', () => {
    expect(rewardChildIds(reward)).toEqual(['c1', 'c2']);
    expect(rewardAppliesToChild(reward, 'c1')).toBe(true);
    expect(rewardAppliesToChild(reward, 'c2')).toBe(true);
    expect(rewardAppliesToChild(reward, 'c3')).toBe(false);
    expect(rewardAudienceLabel(reward, { c1: 'Alex', c2: 'Sam' })).toBe('Alex & Sam');
  });

  test('older single-child rewards still resolve to that child', () => {
    const legacy = { ...presetRewards[0], childId: 'c2', childIds: undefined };
    expect(rewardChildIds(legacy)).toEqual(['c2']);
    expect(rewardAppliesToChild(legacy, 'c1')).toBe(false);
  });
});

describe('points until reward', () => {
  test('with 120 points the preset balance is 30 points from Extra game time', () => {
    const rewards = presetRewardsFor(userId);
    const goal = nextReward(rewards, 120);
    expect(goal?.name).toBe('Extra game time');
    expect(pointsUntilReward(goal!, 120)).toBe(30);
  });

  test('a reward unlocked at exactly its point cost has zero points to go', () => {
    const dinner = presetRewards[0];
    expect(isRewardUnlocked(dinner, 80)).toBe(true);
    expect(pointsUntilReward(dinner, 80)).toBe(0);
    expect(rewardProgressPercent(dinner, 80)).toBe(100);
  });

  test('a locked reward reports progress toward its cost', () => {
    const dinner = presetRewards[0];
    expect(isRewardUnlocked(dinner, 40)).toBe(false);
    expect(rewardProgressPercent(dinner, 40)).toBe(50);
  });

  test('once every goal is unlocked there is no next reward', () => {
    expect(nextReward(presetRewardsFor(userId), 250)).toBeNull();
  });
});

describe('reward validation', () => {
  test('accepts a complete draft', () => {
    expect(validateRewardDraft({ name: 'Movie night', points: 200, description: 'Family movie', childIds: [] })).toBeNull();
  });

  test.each([
    [{ name: '   ', points: 100, description: '', childIds: [] }, 'Enter a reward name.'],
    [{ name: 'Trip', points: 0, description: '', childIds: [] }, 'Enter a whole number of points greater than 0.'],
    [{ name: 'Trip', points: 2.5, description: '', childIds: [] }, 'Enter a whole number of points greater than 0.'],
    [{ name: 'Trip', points: 200000, description: '', childIds: [] }, 'Keep the points under 100,000.'],
    [{ name: 'Trip', points: 100, description: '', childIds: ['c1', 'c1'] }, 'Choose each child only once.'],
  ])('rejects %o', (draft, expected) => {
    expect(validateRewardDraft(draft)).toBe(expected);
  });
});
