@echo off
title LandHere Expo (Tunnel)
cd /d "%~dp0mobile"
echo Installing tunnel dependency if needed...
npx expo install @expo/ngrok@^4.1.0
echo.
echo Starting Expo in TUNNEL mode (works on any network / phone data)...
echo Scan the QR code with Expo Go on your phone.
npx expo start --tunnel
pause
