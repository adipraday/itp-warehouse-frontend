#!/usr/bin/env bash
# Redeploy wms.itpintar.co.id — build production lalu upload ke VPS.
#
# Kenapa bukan `rsync --delete` (lebih ideal buat sync 1 arah kayak gini): mesin dev ini
# (Windows) nggak punya `rsync` di PATH-nya (dicek 2026-09-16). Jalan sekitarnya: bersihin isi
# `dist/` LAMA di VPS dulu lewat SSH, baru `scp -r` upload yang baru — efeknya sama kayak
# `rsync --delete` (nggak ada file asset lama/stale yang numpuk dari build sebelumnya), cuma 2
# langkah manual daripada 1 flag.
#
# Usage: ./deploy/redeploy.sh   (dijalankan dari root repo ini)

set -euo pipefail

SSH_KEY="$HOME/.ssh/warehouse_vps_deploy"
SSH_PORT="2223"
SSH_HOST="adiprada@157.20.95.5"
REMOTE_DIST="/var/www/wms-frontend/dist"

cd "$(dirname "$0")/.."

echo "==> Build production..."
npm run build

echo "==> Bersihin dist/ lama di VPS..."
ssh -i "$SSH_KEY" -p "$SSH_PORT" "$SSH_HOST" "rm -rf ${REMOTE_DIST:?}/* ${REMOTE_DIST:?}/.[!.]* 2>/dev/null || true"

echo "==> Upload build baru..."
scp -i "$SSH_KEY" -P "$SSH_PORT" -r dist/. "$SSH_HOST:$REMOTE_DIST/"

echo "==> Verifikasi..."
curl -s -o /dev/null -w "https://wms.itpintar.co.id -> %{http_code}\n" https://wms.itpintar.co.id/ --max-time 10

echo "==> Bersihin dist/ lokal..."
rm -rf dist

echo "Selesai. Cek https://wms.itpintar.co.id"
