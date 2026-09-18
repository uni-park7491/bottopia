@echo off
cd /d "%~dp0"
if not exist "connector.py" (
  echo connector.py not found. Extract the entire ZIP into a normal folder first.
  pause
  exit /b 1
)
py -3.11 -c "import sys;sys.exit(sys.version_info[:2] != (3,11))" >nul 2>&1
if errorlevel 1 (
  echo Python 3.11 is required: https://www.python.org/downloads/
  pause
  exit /b 1
)
py -3.11 -u "%~dp0connector.py" menu
pause
