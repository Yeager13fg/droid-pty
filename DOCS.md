# Guia de Uso: droid-pty

Após ter rodado o script de instalação no seu Termux, o `droid-pty` já estará dentro da sua pasta `node_modules` pronto para uso.

Siga os exemplos abaixo para integrar a biblioteca no seu projeto.

## 1. Importando e Inicializando (Spawn)

A função principal é a `spawn`, semelhante a bibliotecas como `node-pty` ou `child_process`.

```javascript
import { spawn } from 'droid-pty';

// Inicia o terminal Bash interativo
const pty = spawn('bash', ['-l'], {
  cols: 80,             // Colunas iniciais
  rows: 24,             // Linhas iniciais
  cwd: process.cwd(),   // Diretório de início
  env: process.env      // Repassar variáveis de ambiente (necessário)
});

console.log(`Processo PTY criado com PID: ${pty.pid}`);
```

*Dica: Lembre-se que no Node.js até a versão 26.9, você precisa rodar seu arquivo com a flag de FFI: `node --experimental-ffi seu_app.js`*

## 2. Lendo dados (Eventos)

Tudo que acontecer no terminal (texto digitado, respostas de comandos, outputs) virá através do evento `onData`.

```javascript
pty.onData((dados) => {
    // Imprime exatamente o que o terminal cuspiu na tela
    process.stdout.write(dados);
});
```

## 3. Escrevendo comandos

Para interagir com o terminal rodando em segundo plano (como se você estivesse digitando nele), use a função `write()`. Lembre-se de enviar o `\r` (Return/Enter) no final do comando!

```javascript
// Lista os arquivos da pasta
pty.write('ls -la\r');

// Inicia um script python
pty.write('python3 main.py\r');
```

## 4. Redimensionando o Terminal

Se você estiver construindo uma interface web (com xterm.js) ou recebendo eventos do terminal real, você precisa avisar o PTY quando o tamanho da janela mudar, para que programas como `nano` ou `vim` fiquem com a tela correta.

```javascript
// Ajustar para 120 colunas e 40 linhas
pty.resize(120, 40);
```

## 5. Detectando o fim do programa

O evento `onExit` avisa quando o processo interno encerrou (seja porque terminou com sucesso ou sofreu crash).

```javascript
pty.onExit(({ exitCode, signal }) => {
    console.log(`\n[Processo encerrado - Código: ${exitCode} Sinal: ${signal}]`);
});
```

## 6. Matando o PTY

Se você precisar fechar o terminal de propósito, pode invocar a função `kill()`:

```javascript
pty.kill();           // Equivalente ao kill -15 (SIGTERM)
pty.kill(9);          // Equivalente ao kill -9 (SIGKILL)
pty.kill('SIGINT');   // Manda interrupção (Ctrl+C)
```

## API Completa (Resumo)

O objeto retornado por `spawn` expõe os seguintes dados e métodos:

- **Propriedades**:
  - `pty.pid` (ID do Processo)
  - `pty.cols` (Colunas atuais)
  - `pty.rows` (Linhas atuais)
  - `pty.process` (Nome do processo rodando no momento)

- **Métodos**:
  - `pty.onData(callback)` -> Registra listener de texto.
  - `pty.onExit(callback)` -> Registra listener de encerramento.
  - `pty.write(texto)` -> Escreve no terminal.
  - `pty.resize(colunas, linhas)` -> Redimensiona o terminal.
  - `pty.kill(sinal?)` -> Força a parada do processo.
  - `pty.clear()` -> Limpa a tela.
  - `pty.pause()` e `pty.resume()` -> Pausa ou retoma o fluxo de dados do `onData`.
