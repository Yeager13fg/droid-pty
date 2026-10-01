#!/usr/bin/env bash
set -e

# droid-pty Termux installer

echo "[droid-pty] Iniciando instalação..."

if ! command -v git &> /dev/null; then
    echo "[droid-pty erro] git não encontrado. Por favor instale com: pkg install git"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[droid-pty erro] node não encontrado. Por favor instale com: pkg install nodejs"
    exit 1
fi

REPO_URL="https://github.com/Yeager13fg/droid-pty"
RAW_URL="https://raw.githubusercontent.com/Yeager13fg/droid-pty/master"
INSTALL_SCRIPT="${TMPDIR:-/tmp}/droid-pty-install-$$.mjs"

echo "[droid-pty] Baixando script de instalação..."
curl -fsSL "$RAW_URL/scripts/install.mjs" -o "$INSTALL_SCRIPT"

if [ ! -s "$INSTALL_SCRIPT" ]; then
    echo "[droid-pty erro] Falha ao baixar script de instalação."
    exit 1
fi

export PTY_FFI_REPO="$REPO_URL"

echo "[droid-pty] Executando script no Node.js..."
node "$INSTALL_SCRIPT"

rm -f "$INSTALL_SCRIPT"
echo "[droid-pty] Fim."
