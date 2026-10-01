# droid-pty

Um wrapper TypeScript e pacote NPM nativo para Android (Termux) utilizando `node:ffi`. Traz uma API parecida com o `node-pty`.

## Funcionalidades

* Fork + exec com PTY nativo.
* Controle de redimensionamento (`resize`).
* Fila de leitura/escrita com suporte a buffers.
* Não exige compilação no dispositivo: os binários já vêm pré-compilados e versionados para `aarch64`.

## Instalação (Termux)

```bash
curl -fsSL https://raw.githubusercontent.com/Yeager13fg/droid-pty/master/install.sh | bash
```

Isto vai clonar e copiar o repositório para o seu projeto atual (`node_modules/droid-pty`).

## Uso

Para rodar o seu projeto usando essa biblioteca, dependendo da versão do seu Node.js, pode ser necessário habilitar o FFI usando uma flag:

```bash
# Node.js 26.1 até 26.9 (Requer a flag)
node --experimental-ffi meu-script.js

# Node.js 26.10+ (Já vem ativado por padrão)
node meu-script.js
```

### Exemplo de código:

```javascript
import { spawn } from 'droid-pty';

const term = spawn('bash', ['-l'], {
  cols: 80,
  rows: 24,
  cwd: process.env.HOME,
  env: process.env
});

term.onData((data) => {
  process.stdout.write(data);
});

term.onExit(({ exitCode, signal }) => {
  console.log(`\nProcess exited with code ${exitCode} and signal ${signal}`);
});

term.write('ls\r');

setTimeout(() => {
  term.kill();
}, 5000);
```

## Requisitos

- Node.js >= 26.1 (Para suporte nativo ao `node:ffi`).
- Nas versões do Node antes da 26.10, lembre-se de sempre rodar seu app com `--experimental-ffi`.
- Funciona primariamente em Android via Termux.
