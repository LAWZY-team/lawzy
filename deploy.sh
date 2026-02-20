#!/bin/bash
set -e

cd /opt/lawzy

echo "=== Lawzy Deploy ==="
echo "Environment: ${1:-all}"
echo ""

# Pull latest code
echo "[1/4] Pulling latest code..."
git pull origin main 2>/dev/null || git pull origin production 2>/dev/null || true

# Create UAT database if it doesn't exist
echo "[2/4] Ensuring databases exist..."
docker exec lawzy-mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS lawzy; CREATE DATABASE IF NOT EXISTS lawzy_uat; CREATE DATABASE IF NOT EXISTS nocodb;" 2>/dev/null || true

case "${1}" in
  production)
    echo "[3/4] Building production services..."
    docker compose build frontend backend
    echo "[4/4] Restarting production services..."
    docker compose up -d frontend backend
    ;;
  uat)
    echo "[3/4] Building UAT services..."
    docker compose build frontend-uat backend-uat
    echo "[4/4] Restarting UAT services..."
    docker compose up -d frontend-uat backend-uat
    ;;
  *)
    echo "[3/4] Building all services..."
    docker compose build
    echo "[4/4] Starting all services..."
    docker compose up -d
    ;;
esac

docker image prune -f
echo ""
echo "=== Deploy complete! ==="
docker compose ps
