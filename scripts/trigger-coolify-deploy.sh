#!/bin/bash
# Trigger Coolify deployment after push
# Usage: ./scripts/trigger-coolify-deploy.sh
# Or from VPS: curl -X GET "http://localhost:8000/deploy?tag=production" -H "Authorization: Bearer YOUR_TOKEN"

COOLIFY_URL="${COOLIFY_URL:-http://103.172.79.196:8000}"
TOKEN="${COOLIFY_TOKEN:-1|PfT4E06Fw0HTsXXIN43dBDceUmyQdGXUsbqhcBvl48c3d1c0}"

echo "Triggering Coolify deploy (tag=production)..."
curl -s -X GET "${COOLIFY_URL}/deploy?tag=production" \
  -H "Authorization: Bearer ${TOKEN}" | jq . 2>/dev/null || cat
