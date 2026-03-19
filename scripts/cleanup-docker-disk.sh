#!/bin/bash
# Run this script on the Coolify/build server (103.188.244.246) to free disk space
# Usage: ssh user@103.188.244.246 'bash -s' < scripts/cleanup-docker-disk.sh

set -e
echo "=== Docker disk cleanup ==="
echo "Disk usage before:"
df -h /

echo ""
echo "Removing unused Docker build cache..."
docker builder prune -af

echo ""
echo "Removing unused images..."
docker image prune -af

echo ""
echo "Removing stopped containers..."
docker container prune -f

echo ""
echo "Disk usage after:"
df -h /
echo ""
echo "=== Cleanup complete ==="
