# Folder plan

This is how we are organizing RemindME. The backend is still undecided, so we are only saving a place for it right now.

```text
frontend/
  app/                    screens and navigation (Expo Router)
  src/
    features/
      accounts/           sign in and profiles
      tasks/              tasks and reminders
      timer/              task timer
      child-dashboard/    child's home screen
    shared/
      components/         buttons and other reused UI
      data/               code that reads and saves data
backend/                  backend code later, after we choose the stack
```


The frontend is planned as React Native + Expo with TypeScript. We have not picked the backend yet. When we add app code, we will add tests and connect them to CI. Our branch flow is still feature branch -> `devs` -> `main`.
