@echo off
title LandHere Backend
cd /d "%~dp0"
echo Starting LandHere backend on 0.0.0.0:8000...
call .venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
