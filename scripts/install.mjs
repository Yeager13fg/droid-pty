import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// User can override repo or ref
const REPO = process.env.PTY_FFI_REPO || 'https://github.com/Yeager13fg/droid-pty.git';
const REF = process.env.PTY_FFI_REF || 'master';
const FORCE = process.argv.includes('--force');

function log(msg) {
  console.log(`\x1b[36m[droid-pty]\x1b[0m ${msg}`);
}

function error(msg) {
  console.error(`\x1b[31m[droid-pty erro]\x1b[0m ${msg}`);
  process.exit(1);
}

// 1. Find target directory (consumer project root)
let targetDir = process.cwd();
let foundPackageJson = false;

// simplistic search up to 3 levels
for (let i = 0; i < 3; i++) {
  if (fs.existsSync(path.join(targetDir, 'package.json'))) {
    foundPackageJson = true;
    break;
  }
  targetDir = path.dirname(targetDir);
}

if (!foundPackageJson) {
  // Just fallback to cwd if no package.json found
  targetDir = process.cwd();
  log(`Nenhum package.json encontrado. Instalando em ${targetDir}`);
}

// 2. Check requirements
if (process.platform !== 'android') {
  log(`Aviso: Plataforma atual é '${process.platform}', mas o droid-pty foi feito para Android (Termux).`);
}

try {
  execSync('git --version', { stdio: 'ignore' });
} catch (e) {
  error('git não está instalado. Instale com "pkg install git" no Termux.');
}

// 3. Clone repo
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'droid-pty-'));
log(`Clonando ${REPO} branch/tag ${REF} para diretório temporário...`);

try {
  execSync(`git clone --depth 1 --branch ${REF} ${REPO} ${tmpDir}`, { stdio: 'inherit' });
} catch (e) {
  error(`Falha ao clonar o repositório ${REPO}. Verifique a URL e a tag/branch.`);
}

// 4. Validate clone
const expectedFiles = [
  'dist/index.mjs',
  'prebuilt/android-arm64/libpty_helper.so',
  'package.json'
];

for (const file of expectedFiles) {
  if (!fs.existsSync(path.join(tmpDir, file))) {
    error(`Clone inválido. Arquivo esperado não encontrado: ${file}`);
  }
}

// 5. Copy to node_modules
const destDir = path.join(targetDir, 'node_modules', 'droid-pty');

if (fs.existsSync(destDir)) {
  if (FORCE) {
    fs.rmSync(destDir, { recursive: true, force: true });
  } else {
    log(`A pasta ${destDir} já existe. Removendo para reinstalar...`);
    fs.rmSync(destDir, { recursive: true, force: true });
  }
}

fs.mkdirSync(destDir, { recursive: true });

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      if (childItemName === '.git') return; // skip git
      // Only copy necessary files for runtime to save space
      if (src === tmpDir && !['dist', 'prebuilt', 'package.json', 'README.md'].includes(childItemName)) {
        return;
      }
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

log(`Copiando arquivos para ${destDir}...`);
copyRecursiveSync(tmpDir, destDir);

// 6. Save metadata
const commit = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim();
fs.writeFileSync(path.join(destDir, '.pty-ffi-install.json'), JSON.stringify({
  repo: REPO,
  ref: REF,
  commit,
  date: new Date().toISOString()
}, null, 2));

// Clean up
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (e) {}

log(`Sucesso! droid-pty instalado.`);
log(`Agora você pode usar no seu código: import { spawn } from 'droid-pty';`);
