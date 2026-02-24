@echo off
title KUMA - Punto de venta
cd /d "%~dp0"

REM Si no existe node_modules, instalar dependencias
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call npm install
    if errorlevel 1 (
        echo Error al instalar. Asegurate de tener Node.js instalado: https://nodejs.org
        pause
        exit /b 1
    )
)

REM Si no existe dist, compilar
if not exist "dist\server.js" (
    echo Compilando aplicacion...
    call npm run build
    if errorlevel 1 (
        echo Error al compilar.
        pause
        exit /b 1
    )
)

echo Iniciando KUMA...
echo Abriendo navegador en http://localhost:3000
echo Para cerrar la aplicacion cierra esta ventana.
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
node dist/server.js

pause
