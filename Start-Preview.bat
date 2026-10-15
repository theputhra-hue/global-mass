@echo off
cd /d "%~dp0"
if exist "backend\.venv\Scripts\python.exe" (
  "backend\.venv\Scripts\python.exe" scripts\preview-project.py --port 4173
) else (
  python scripts\preview-project.py --port 4173
)
pause
