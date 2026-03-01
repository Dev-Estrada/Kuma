@echo off
REM Solo recompila sqlite3 para Electron. Ejecutar desde la carpeta del proyecto.
set "VSDEVCMD=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" (
  echo No se encontro VsDevCmd.bat.
  exit /b 1
)
call "%VSDEVCMD%" -arch=amd64
cd /d "%~dp0.."
echo.
echo === Recompilando sqlite3 para Electron ===
npx electron-rebuild -f -w sqlite3
echo.
echo === Codigo de salida: %ERRORLEVEL% ===
pause
