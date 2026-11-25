@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt. Bitte von https://nodejs.org installieren. & pause & exit /b 1)
node ablage-server.mjs
pause
