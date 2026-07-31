@echo off
title LandHere Expo
cd /d "%~dp0mobile"
echo Starting Expo in LAN mode...
npx expo start --lan
pause
