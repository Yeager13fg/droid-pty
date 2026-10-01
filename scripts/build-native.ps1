# build-native.ps1
# Este script compila a lib em Rust para Android (aarch64) a partir do Windows.
# Requisitos:
# 1. Android NDK instalado (via Android Studio ou manual).
# 2. Variável de ambiente ANDROID_NDK_HOME configurada.
# 3. cargo-ndk instalado: `cargo install cargo-ndk`

$ErrorActionPreference = "Stop"

Write-Host "[droid-pty] Iniciando build nativo para Android (aarch64)..." -ForegroundColor Cyan

# Verifica se o target do rustup está instalado
rustup target add aarch64-linux-android

# Verifica se o cargo-ndk está disponível
if (-not (Get-Command "cargo-ndk" -ErrorAction SilentlyContinue)) {
    Write-Host "[droid-pty] cargo-ndk não encontrado. Instalando..." -ForegroundColor Yellow
    cargo install cargo-ndk
}

# Verifica o NDK
if (-not $env:ANDROID_NDK_HOME) {
    Write-Host "[droid-pty erro] A variável de ambiente ANDROID_NDK_HOME não está definida." -ForegroundColor Red
    Write-Host "Aponte-a para o diretório do seu NDK (ex: C:\Users\nome\AppData\Local\Android\Sdk\ndk\26.1.10909125)"
    exit 1
}

Push-Location native

Write-Host "[droid-pty] Compilando libpty_helper.so (release)..." -ForegroundColor Cyan
cargo ndk -t arm64-v8a build --release

$arch = "arm64-v8a" # cargo-ndk output dir name for aarch64
$srcSo = "target/aarch64-linux-android/release/libpty_helper.so"
$destDir = "prebuilt/android-arm64"

Pop-Location

if (Test-Path $destDir) {
    Remove-Item -Recurse -Force $destDir
}
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Copy-Item "native/$srcSo" -Destination "$destDir/libpty_helper.so"

Write-Host "[droid-pty] Build concluído com sucesso!" -ForegroundColor Green
Write-Host "Arquivo salvo em: prebuilt/android-arm64/libpty_helper.so" -ForegroundColor Green
