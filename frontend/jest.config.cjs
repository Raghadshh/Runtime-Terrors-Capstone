module.exports = {
  preset: 'jest-expo',
  testTimeout: 15000,
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx', '<rootDir>/src/features/**/tests/*.test.tsx'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/shared/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/shared/lib/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
