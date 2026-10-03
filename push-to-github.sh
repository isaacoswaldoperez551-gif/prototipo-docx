#!/usr/bin/env bash
# Script para conectar y subir el repositorio a GitHub
# Uso: ./push-to-github.sh <TU_USUARIO_GITHUB> [NOMBRE_REPO]

GITHUB_USER="$1"
REPO_NAME="${2:-prototipo-docx}"

if [ -z "$GITHUB_USER" ]; then
  echo "Uso: ./push-to-github.sh <TU_USUARIO_GITHUB> [NOMBRE_REPO]"
  echo "Ejemplo: ./push-to-github.sh isaacoswaldo prototipo-docx"
  exit 1
fi

echo "==> Configurando origen remoto: https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
git branch -M main

echo "==> Para enviar tu código a GitHub, ejecuta:"
echo "git push -u origin main"
