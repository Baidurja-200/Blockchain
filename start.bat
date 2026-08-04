@echo off
title ChainVerify Launcher
cd /d "%~dp0"

echo Starting ChainVerify (server + client)...
echo This window must stay open while you use the app.
echo Close it to stop everything.
echo.

start "ChainVerify - server + client" cmd /k "npm run dev"

echo Waiting for the app to boot...
timeout /t 8 /nobreak >nul

start "" "http://localhost:5173"

exit
