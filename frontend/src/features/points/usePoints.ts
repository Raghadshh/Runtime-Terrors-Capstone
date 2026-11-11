import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchPoints, redeemReward as redeem, subscribeToPoints, type PointsSummary } from './pointsApi';

const empty: PointsSummary = { balance: 0, earned: 0, redemptions: [] };

export function usePoints(owner: string, childId: string | null, revision: string) {
  const scope = owner + '|' + (childId ?? 'self');
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const request = useRef(0);
  const [snapshot, setSnapshot] = useState<{ scope: string; data: PointsSummary } | null>(null);
  const [status, setStatus] = useState({ scope: '', loading: false, error: null as string | null });

  const reload = useCallback(async () => {
    const ticket = ++request.current;
    if (!owner) { setSnapshot(null); return; }
    setStatus({ scope, loading: true, error: null });
    try {
      const data = await fetchPoints(childId);
      if (ticket !== request.current || currentScope.current !== scope) return;
      setSnapshot({ scope, data });
      setStatus({ scope, loading: false, error: null });
    } catch (cause) {
      if (ticket !== request.current || currentScope.current !== scope) return;
      setStatus({ scope, loading: false, error: cause instanceof Error ? cause.message : 'Could not load points.' });
    }
  }, [owner, childId, scope]);

  useEffect(() => {
    void reload();
    if (!owner) return;
    const unsubscribe = subscribeToPoints(owner, () => void reload());
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void reload(); });
    return () => { unsubscribe(); listener.remove(); ++request.current; };
  }, [owner, reload, revision]);

  async function redeemReward(rewardId: string, requestId: string, expectedCost: number) {
    if (!owner) throw new Error('Log in to redeem rewards.');
    const receipt = await redeem(rewardId, childId, requestId, expectedCost);
    if (currentScope.current === scope) await reload();
    return receipt;
  }

  const data = snapshot?.scope === scope ? snapshot.data : empty;
  return {
    ...data, redeemReward, reloadPoints: reload,
    pointsLoading: !!owner && (status.scope !== scope || status.loading),
    pointsError: status.scope === scope ? status.error : null,
  };
}
