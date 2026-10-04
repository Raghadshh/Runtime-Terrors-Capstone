export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function accountErrors(email: string, password: string, confirmation: string) {
  return {
    email: validEmail(email) ? '' : 'Enter a valid email.',
    password: password.length >= 8 ? '' : 'Use at least 8 characters.',
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
