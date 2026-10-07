export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const passwordRequirements = 'At least 8 characters, including an uppercase letter, a number, and a special character.';

export function passwordError(password: string): string {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Include at least one number.';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'Include at least one special character, such as !, @, or #.';
  return '';
}

export function accountErrors(email: string, password: string, confirmation: string) {
  return {
    email: validEmail(email) ? '' : 'Enter a valid email.',
    password: passwordError(password),
    confirmation: password === confirmation ? '' : 'Passwords do not match.',
  };
}

export function childProfileErrors(name: string, age: string) {
  const ageNumber = Number(age);
  return {
    name: name.trim() ? '' : 'Enter a child name.',
    age:
      /^\d+$/.test(age) && ageNumber >= 1 && ageNumber <= 17
        ? ''
        : 'Enter an age from 1 to 17.',
  };
}
