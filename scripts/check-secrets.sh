#!/usr/bin/env bash
# Faller om hemligheter refereras utanför serverfiler.
set -u
bad=$(grep -rnE "SERVICE_ROLE|service_role" src \
  --include=*.ts --include=*.tsx \
  | grep -vE "\.(server|functions)\.ts:" || true)
if [ -n "$bad" ]; then
  echo "Hemlighet utanför serverfil:"; echo "$bad"; exit 1
fi
if grep -rnE "VITE_[A-Z_]*(SECRET|SERVICE)" .env.example src 2>/dev/null; then
  echo "Hemlighet med VITE_-prefix"; exit 1
fi
echo "OK"
