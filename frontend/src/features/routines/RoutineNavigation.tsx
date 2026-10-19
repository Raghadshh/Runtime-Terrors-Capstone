import { router } from 'expo-router';
import { RemindTabBar } from '@/components/tab-bar';
import { useDashboardNavigation } from '@/lib/dashboardNavigation';

const routes = ['home', 'tasks', 'routines', 'progress', 'profile'].map(name => ({ name, key: name }));
export function RoutineNavigation() {
  const navigation = useDashboardNavigation();
  return <RemindTabBar state={{ index: 2, routes }} navigation={{ navigate(name) {
    if (name === 'home' || name === 'tasks' || name === 'routines') {
      router.replace(name === 'home' ? '/home' : name === 'tasks' ? '/tasks' : '/routines');
    } else navigation.push('/' + name);
  } }} />;
}
