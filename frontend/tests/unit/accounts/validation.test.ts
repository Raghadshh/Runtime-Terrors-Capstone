/// <reference types="jest" />
import { accountErrors, childProfileErrors, passwordError, validEmail } from '../../../src/features/accounts/validation';

test('accepts a valid account and trims the email', () => {
  expect(validEmail(' me@example.com ')).toBe(true);
  expect(accountErrors('me@example.com', 'Password123!', 'Password123!')).toEqual({
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



test.each([
  ['Ab1!', 'Use at least 8 characters.'],
  ['password1!', 'Include at least one uppercase letter.'],
  ['Password!!', 'Include at least one number.'],
  ['Password12', 'Include at least one special character, such as !, @, or #.'],
  ['Password1 ', 'Include at least one special character, such as !, @, or #.'],
])('rejects a password missing a requirement: %s', (password, message) => {
  expect(passwordError(password)).toBe(message);
  expect(accountErrors('me@example.com', password, password).password).toBe(message);
});

test.each(['Abcdef1!', 'Longer passphrase 1!', 'ABCDEFG1#'])('accepts a compliant password: %s', password => {
  expect(passwordError(password)).toBe('');
});
