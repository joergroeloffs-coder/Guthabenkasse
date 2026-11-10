#!/bin/sh
# Führt die neuen Prüfreihen aus (Node 22, Playwright global installiert; Bauen vorher: node bauen/bauen.mjs)
cd "$(dirname "$0")/.." && node tests/test-server-v2.mjs && node tests/test-app-v2.mjs && node tests/test-app-v2b.mjs && node tests/test-app-v2c.mjs && node tests/test-anzeige.mjs && node tests/test-rueckseite.mjs && node tests/test-kartenvorschau.mjs && node tests/test-auszahlung.mjs && node tests/test-kamerawahl.mjs && node tests/test-kartenakkordeon.mjs && node tests/test-abend.mjs
