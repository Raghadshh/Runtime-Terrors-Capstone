# RemindME — Runtime Terrors

RemindME is our capstone mobile app for managing tasks and routines. Parents/caregivers can manage child profiles, and independent users can manage their own activities. We are building it with React Native, Expo, TypeScript, and Supabase.

## Team

- Raghad Shaheen
- Nabila Khan
- Salena Tasali
- Jeel Dharmeshkumar Patel

## Sprint progress

### Sprint 0 — Project setup

We set up the repository, Expo app, branch workflow, initial documentation, and GitHub Actions checks. We also prepared the requirements and Figma designs that guide our screens.

### Sprint 1 — Accounts and task foundation

- Account creation, email/password login, password reset, and parent/independent profile setup.
- Creating and managing child profiles.
- Parent, independent, and child dashboards connected to account and task data.
- Creating, editing, assigning, deleting, repeating, and completing tasks.
- Task durations and a countdown timer with start, pause, resume, and reset.
- Task reminder scheduling code. Notification delivery still needs device testing in a development build; Android Expo Go skips this integration.
- Password validation and hiding task edit/delete controls when tasks are opened from the child dashboard.

Points, rewards, and garden totals shown in the dashboard are not a finished reward system yet.

### Sprint 2 — In progress

- **F1 — Tasks/Reminders (Jeel):** Add routine reminders and verify the task reminders from Sprint 1. (R10)
- **F2 — Routine Builder (Raghad):** Create and manage routines, reorder and reuse steps, assign routines to children, and track step completion. (R13, R14, R15, R18)
- **F3 — Focus Mode (Salena):** Show one current task or routine step at a time. (R17)
- **F6 — Routine Templates (Salena):** Add customizable morning, bedtime, and homework templates. (R16)
- **F7 / F14 — Just Start Mode & Timer (Jeel):** Use the countdown timer for a short session to help users get started. (R12)
- **F9 — Task Breakdown (Nabila):** Break larger tasks into smaller steps and checklists. (R11)

## How the app is organized

The mobile app connects directly to Supabase for authentication and database access.

- `frontend/app/`: Expo Router files. These connect URLs/screens to the feature components.
- `frontend/src/features/accounts/`: Login, registration, profiles, password validation, and the Supabase client.
- `frontend/src/features/tasks/`: Task screens, repeat rules, saving tasks, and reminder scheduling.
- `frontend/src/features/timer/`: The shared countdown timer logic and controls.
- `frontend/src/features/routines/`: Routine screens, validation, Supabase calls, and shared routine state.
- `frontend/src/features/child-dashboard/`: Parent, independent, and child dashboard layouts.
- `frontend/src/shared/components/`: Reusable buttons, cards, navigation, progress bars, and screen layouts.
- `frontend/src/shared/lib/`: Shared types, formatting, dashboard data, and navigation helpers.
- `frontend/assets/`: Bundled images and illustrations.
- `backend/supabase/migrations/`: SQL files that create database tables, validation rules, and row-level security policies. Apply them in filename order.
- `backend/supabase/tests/`: Database checks for routine saving and account access rules.
- `frontend/tests/unit/` and feature `tests/` folders: Jest and React Native Testing Library tests.
- `docs/`: Supporting project/setup documentation.
- `.github/workflows/`: GitHub Actions checks.
- `.local/`: Ignored Android SDK/emulator files for local development.

The providers in `frontend/app/_layout.tsx` share account, task, and routine data with the screens. Supabase Auth manages login sessions, PostgreSQL stores the records, and row-level security controls which records each account can access.

## Run locally

From the repository:

```powershell
cd frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Add your Supabase project URL and publishable key to `.env.local`. The command above preserves an existing file.

In the Supabase SQL Editor, apply any migrations your project has not run yet, in order:

1. `backend/supabase/migrations/20261002_accounts_profiles.sql`
2. `backend/supabase/migrations/20261006_f1_tasks_reminders.sql`
3. `backend/supabase/migrations/20261018_routine_builder.sql`

Run new migrations in Supabase before using the features that need them.

Then, from `frontend`:

```powershell
npm run android
```

Keep Metro running. See [Android setup](docs/ANDROID_SETUP.md) for emulator instructions. For iOS development on macOS, use `npm run ios`.

## Testing

From `frontend`:

```powershell
npm run typecheck
npm test -- --watch=false
```

Tests use Jest and React Native Testing Library. Database checks are in `backend/supabase/tests/` and can be run in the Supabase SQL Editor after applying the migrations.

## GitHub workflow

- `main`: stable version.
- `devs`: shared development.
- Feature branches: individual work, such as `feature/routine-builder`.

Pull the latest `devs`, create a feature branch, implement and test, then open a PR into `devs` for teammate review. Do not work directly on `main` or `devs`. After combined features are tested, open a PR from `devs` into `main`.

Our [CI workflow](.github/workflows/ci.yml) runs TypeScript and Jest checks on PRs and pushes to `devs` and `main`. Database migrations are applied separately in Supabase.
