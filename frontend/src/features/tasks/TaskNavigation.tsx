import { router } from 'expo-router';
import { RemindTabBar } from '@/components/tab-bar';
import { useDashboardNavigation } from '@/lib/dashboardNavigation';

const routes = ['home', 'tasks', 'routines', 'progress', 'profile'].map(name => ({ name, key: name }));

export function TaskNavigation() {
  const navigation = useDashboardNavigation();
  return <RemindTabBar state={{ index: 1, routes }} navigation={{ navigate(name) {
    if (name === 'home' || name === 'tasks') router.replace(name === 'home' ? '/home' : '/tasks');
    else navigation.push('/' + name);
  } }} />;
}
