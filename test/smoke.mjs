import { spawn } from '../dist/index.mjs';

console.log('Smoke test for droid-pty');

try {
  const pty = spawn('ls', ['-la'], {
    cols: 80,
    rows: 24,
    cwd: process.cwd()
  });

  pty.onData((data) => {
    process.stdout.write(data);
  });

  pty.onExit(({ exitCode, signal }) => {
    console.log(`\nExited with code: ${exitCode}, signal: ${signal}`);
  });
} catch (e) {
  console.error(e);
}
