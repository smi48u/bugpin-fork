#!/bin/sh
# Fix ownership of the mounted data volume (Coolify/host mounts are often root-owned),
# then drop privileges to the unprivileged bun user before starting the server.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data/uploads
  if [ "$(stat -c %u /data)" != "$(id -u bun)" ]; then
    chown -R bun:bun /data
  fi
  exec su-exec bun "$@"
fi
exec "$@"
