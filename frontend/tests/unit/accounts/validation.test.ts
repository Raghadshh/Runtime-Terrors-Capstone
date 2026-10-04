/// <reference types="jest" />
import { accountErrors, childProfileErrors, validEmail } from '../../../src/features/accounts/validation';

test('accepts a valid account and trims the email', () => {
  expect(validEmail(' me@example.com ')).toBe(true);
  expect(accountErrors('me@example.com', 'password123', 'password123')).toEqual({
    email: '', password: '', confirmation: '',
  });
});

test('rejects invalid email, short password, and mismatched confirmation', () => {
  expect(accountErrors('bad-email', 'short', 'different')).toEqual({
    email: 'Enter a valid email.',
    password: 'Use at least 8 characters.',
    confirmation: 'Passwords do not match.',
  });
});

test('child names cannot be empty and ages must be whole numbers from 1 to 17', () => {
  expect(childProfileErrors('  ', '12').name).toBe('Enter a child name.');
  for (const age of ['', '0', '18', '-1', '1.5', 'abc']) {
    expect(childProfileErrors('Mark', age).age).toBe('Enter an age from 1 to 17.');
  }
  for (const age of ['1', '12', '17']) {
    expect(childProfileErrors('Mark', age)).toEqual({ name: '', age: '' });
  }
});


