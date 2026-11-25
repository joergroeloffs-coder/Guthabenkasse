#!/bin/sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Node.js fehlt (https://nodejs.org)."; exit 1; }
exec node ablage-server.mjs
