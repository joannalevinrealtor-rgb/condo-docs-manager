#!/bin/bash
# Launches the Next.js dev server with Node on PATH so Turbopack's helper
# processes (e.g. the Tailwind PostCSS worker) can find `node`.
cd "$(dirname "$0")/.." || exit 1
export PATH="/Users/joannalevin/.nvm/versions/node/v24.18.0/bin:$PATH"
exec node node_modules/next/dist/bin/next dev --port 3000
