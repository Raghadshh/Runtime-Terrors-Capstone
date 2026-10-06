import { useRouter, type Href } from 'expo-router';
import { Alert } from 'react-native';

export function useDashboardNavigation() {
  const router = useRouter();
  return {
    ...router,
    push(path: string) {
      if (['/profile', '/choose-child', '/home', '/children'].includes(path) || path === '/tasks' || path.startsWith('/tasks/')) {
        router.push(path as Href);
      } else {
        Alert.alert('Coming soon', 'This feature is not available yet.');
      }
    },
  };
}