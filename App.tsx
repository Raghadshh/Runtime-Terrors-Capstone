import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, View, Text } from 'react-native';
import { ParentTaskForm } from './src/components/ParentTaskForm';
import ChildTaskCard from './src/components/ChildTaskCard';

export default function App() {
  const handleTaskSubmit = (task: any) => {
    console.log('Task Created:', task);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>RemindME Test Wrapper</Text>
        
        <ParentTaskForm onTaskSubmit={handleTaskSubmit} />

        <View style={styles.spacer} />

        <ChildTaskCard
          title="Clean Your Room"
          duration={15}
          onComplete={() => console.log('Task completed!')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  spacer: {
    height: 20,
  },
});