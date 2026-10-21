@echo off
set PATH=C:\Program Files\nodejs;%PATH%

echo === Cleaning npm cache ===
call npm cache clean --force

echo === Installing dependencies ===
call npm install --legacy-peer-deps

if %ERRORLEVEL% neq 0 (
    echo.
    echo Install failed. Retrying once...
    call npm install --legacy-peer-deps
)

echo.
echo === Starting dev server at http://localhost:3000 ===
call npm start
pause
