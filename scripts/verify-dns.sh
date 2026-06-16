#!/usr/bin/env bash
# DNS record required for lms.edunexservices.com (Cloudflare).
# Replace Vercel CNAME with:
#   Type: A | Name: lms | Content: 187.127.143.207 | Proxy: DNS only (grey cloud)
#
# Verify:
#   dig +short lms.edunexservices.com A
# Expected: 187.127.143.207

set -euo pipefail

TARGET_IP="187.127.143.207"
HOST="lms.edunexservices.com"

RESOLVED="$(dig +short "$HOST" A 2>/dev/null | head -1 || true)"

if [[ "$RESOLVED" == "$TARGET_IP" ]]; then
  echo "OK   $HOST -> $TARGET_IP"
  exit 0
fi

# Still on Vercel CNAME?
CNAME="$(dig +short "$HOST" CNAME 2>/dev/null | head -1 || true)"
if [[ -n "$CNAME" ]]; then
  echo "FAIL $HOST still points to CNAME: $CNAME (delete Vercel CNAME, add A record)"
else
  echo "FAIL $HOST DNS not pointing to $TARGET_IP (got: ${RESOLVED:-<none>})"
fi

echo ""
echo "Cloudflare (edunexservices.com zone):"
echo "  1. Delete: lms CNAME → vercel-dns-..."
echo "  2. Add:    lms A → $TARGET_IP (grey cloud / DNS only)"
exit 1
