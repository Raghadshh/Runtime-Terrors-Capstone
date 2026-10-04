// Find the Android SDK even when VS Code has old environment settings.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

if (process.platform === 'win32') {
  const localAndroid = path.resolve(__dirname, '../../.local');
  const candidates = [
    path.join(localAndroid, 'android-sdk'),
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk'),
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
  ].filter(Boolean);
  const sdk = candidates.find(folder => fs.existsSync(path.join(folder, 'platform-tools', 'adb.exe')));
  if (!sdk) {
    console.error('Cannot find adb.exe in the Android SDK folders checked:');
    for (const folder of new Set(candidates)) console.error('  ' + folder);
    console.error('Set ANDROID_HOME to the SDK folder. See docs/ANDROID_SETUP.md.');
    process.exit(1);
  }
  process.env.ANDROID_HOME = sdk;
  const localAvd = path.join(localAndroid, 'android-avd');
  if (fs.existsSync(localAvd)) {
    process.env.ANDROID_AVD_HOME = localAvd;
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME ||= '127.0.0.1';
  }
  process.env.PATH = [path.join(sdk, 'platform-tools'), path.join(sdk, 'emulator'), process.env.PATH || ''].join(path.delimiter);
}

const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'start', '--android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 0; });
