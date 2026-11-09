#!/bin/sh
# Führt die neuen Prüfreihen aus (Node 22, Playwright global installiert; Bauen vorher: node bauen/bauen.mjs)
cd "$(dirname "$0")/.." && node tests/test-server-v2.mjs && node tests/test-app-v2.mjs && node tests/test-app-v2b.mjs && node tests/test-app-v2c.mjs && node tests/test-anzeige.mjs
