@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY.ps1"
set "part_exit=%errorlevel%"
echo.
pause
exit /b %part_exit%
