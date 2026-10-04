# Run on Android

From the project folder:

```powershell
cd frontend
npm ci
npm run android
```

Run `npm ci` only the first time. Keep the terminal open. Press `a` to reopen Android, `r` to reload, and Ctrl+C to stop.

Your emulator is already set up. On another PC, install Android Studio and create a virtual phone first.

Copy `.env.example` to `.env.local` and add the Supabase URL and publishable key if they are missing.

If the port is busy, accept the next available port.
