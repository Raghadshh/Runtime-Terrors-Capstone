import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { validateTaskInput } from '../utils/taskValidation';

export const ParentTaskForm = ({ onTaskSubmit }: { onTaskSubmit: (task: any) => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [duration, setDuration] = useState('');
  const [childId, setChildId] = useState('');

  const handleSubmit = () => {
    const numericDuration = parseInt(duration, 10);
    const validation = validateTaskInput({
      title,
      estimatedDuration: numericDuration,
      dueDate,
      assignedChildId: childId,
    });

    if (!validation.isValid) {
      const errorMsg = Object.values(validation.errors).join('\n');
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    onTaskSubmit({
      title,
      description,
      dueDate,
      estimatedDuration: numericDuration,
      assignedChildId: childId,
    });

    setTitle('');
    setDescription('');
    setDuration('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create New Task</Text>
      <TextInput style={styles.input} placeholder="Task Title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Description (Optional)" value={description} onChangeText={setDescription} />
      <TextInput style={styles.input} placeholder="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
      <TextInput style={styles.input} placeholder="Estimated Duration (Mins)" keyboardType="numeric" value={duration} onChangeText={setDuration} />
      <TextInput style={styles.input} placeholder="Assign to Child ID" value={childId} onChangeText={setChildId} />
      <Button title="Save Task" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', borderRadius: 8 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, borderRadius: 4 },
});