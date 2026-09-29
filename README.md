# Runtime-Terrors-Capstone

Capstone project for a routine, task, and habit tracking app called RemindME.

## Team
- Raghad Shaheen
- Nabila Khan
- Salena tasali
- Jeel Dharmeshkumar Patel

## GitHub Workflow
- main = stable version
- devs = team development branch
- feature branches = individual tasks/features

### How We Work

1. Do not work directly on `main` or `devs`.
2. Before starting a task create a new branch from `devs`.
3. Name the branch based on what you are working on.
   - Example: `feature/login`
4. Make and commit your changes on your feature branch.
5. When finished create a PR from your feature branch into `devs`.
6. After features in `devs` are tested create a Pull Request from `devs` into `main`.
7. `main` requires approval from at least one teammate before merging

## CI/CD

CI means GitHub checks our code after we push it or open a PR.

Our [CI workflow](.github/workflows/ci.yml) checks the frontend and backend on PRs into `devs` and `main`. The frontend starter has a TypeScript check. We will add feature tests as we write code. The backend check waits until we choose a backend.
