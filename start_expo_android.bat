@echo off
title LandHere Expo (Android Emulator)
cd /d "%~dp0mobile"
echo Starting Expo for Android emulator...
echo Make sure an Android Virtual Device (AVD) is running in Android Studio first.
npx expo start --android
pause
