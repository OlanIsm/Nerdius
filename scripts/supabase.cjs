const { existsSync } = require('node:fs');
const { delimiter, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env };
if (process.platform === 'win32') {
  const dockerDirs = [
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'DockerDesktop', 'resources', 'bin'),
    join(env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin'),
  ].filter(Boolean);
  const dockerDir = dockerDirs.find(dir => existsSync(join(dir, 'docker.exe')));
  if (dockerDir) env.PATH = `${dockerDir}${delimiter}${env.PATH || ''}`;
}

if (!process.env.npm_execpath) {
  console.error('Run the Supabase helper through an npm script.');
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      process.env.npm_execpath,
      'exec',
      '--yes',
      '--package=supabase',
      '--',
      'supabase',
      ...process.argv.slice(2),
    ],
    { env, stdio: 'inherit' },
  );
  if (result.error) {
    console.error(`Could not run Supabase CLI: ${result.error.message}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
