@echo off
REM Carga el entorno de Visual Studio Build Tools 2022 para que node-gyp encuentre el Windows SDK.
set "VSDEVCMD=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if not exist "%VSDEVCMD%" (
  echo No se encontro VsDevCmd.bat en Build Tools 2022. Asegurate de tener instalado Windows SDK.
  exit /b 1
)
call "%VSDEVCMD%" -arch=amd64
cd /d "%~dp0.."
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build && node scripts/obfuscate.js && npx electron-rebuild -f -w sqlite3 && npx electron-builder --win
