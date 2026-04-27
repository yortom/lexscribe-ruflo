#!/usr/bin/env bash
set -euo pipefail
CERT_DIR="$(dirname "$0")/../nginx/certs"
mkdir -p "$CERT_DIR"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/lexscribe.key" \
  -out    "$CERT_DIR/lexscribe.crt" \
  -subj "/CN=lexscribe.local"
echo "Self-signed cert generated at $CERT_DIR"
