import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { ParentTaskForm } from './src/components/ParentTaskForm';
import ChildTaskCard from './src/components/ChildTaskCard';

export default function App() {
  const handleTaskSubmit = (task: any) => {
    Alert.alert('Task Created!', JSON.stringify(task, null, 2));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ParentTaskForm onTaskSubmit={handleTaskSubmit} />
        <ChildTaskCard
          title="Clean Your Room"
          duration={15}
          onComplete={() => Alert.alert('Task Done!', 'Child completed the task.')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16 },
});