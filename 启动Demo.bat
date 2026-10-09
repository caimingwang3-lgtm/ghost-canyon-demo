@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>nul
if not errorlevel 1 (
  set "GHOST_CANYON_AUTO_OPEN=1"
  node "%~dp0server.cjs"
  goto :end
)

where py.exe >nul 2>nul
if not errorlevel 1 (
  echo Node.js was not found. Starting with Python's built-in web server.
  start "" "http://127.0.0.1:4173/index.html"
  py -m http.server 4173 --bind 127.0.0.1
  goto :end
)

echo This demo needs Node.js or Python to run its local web server.
echo Install Node.js, then double-click this file again.
pause

:end
endlocal
