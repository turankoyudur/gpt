@echo off
setlocal enabledelayedexpansion

REM ==============================================================
REM DayZ Web Panel - Start script (Windows 11)
REM - Ensures dist build exists
REM - Starts the Node server (serves SPA + API)
REM
REM Logs to ./data/logs/start-YYYYMMDD-HHMMSS.log
REM ==============================================================

set ROOT=%~dp0..\..
cd /d "%ROOT%"

REM --- basic sanity ---
if not exist "package.json" (
  echo ERROR: package.json not found. Please run from the project root.
  exit /b 2
)

if not exist "data/logs" mkdir "data/logs"

REM --- locale-safe timestamp (avoids Turkish date formats breaking filenames) ---
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TS=%%i
set LOGFILE=data\logs\start-%TS%.log

call :log "=== DayZ Web Panel Start ==="

REM --- verify node_modules ---
if not exist "node_modules" (
  call :log "ERROR: node_modules not found. Run scripts\\windows\\install.bat first."
  exit /b 20
)

REM --- verify DB client (Prisma) ---
call :log "Ensuring Prisma client + DB schema (db:setup)..."
npm run db:setup >>"%LOGFILE%" 2>&1
if errorlevel 1 (
  call :log "ERROR: db:setup failed. See log: %LOGFILE%"
  exit /b 22
)

REM --- verify build ---
if not exist "dist/server/node-build.mjs" (
  call :log "dist not found. Running build..."
  npm run build >>"%LOGFILE%" 2>&1
  if errorlevel 1 (
    call :log "ERROR: build failed. See log: %LOGFILE%"
    exit /b 21
  )
)

call :log "Starting server..."
node dist/server/node-build.mjs >>"%LOGFILE%" 2>&1

REM If node exits, we log the exit code
set EXITCODE=%errorlevel%
call :log "Server exited with code %EXITCODE%"
exit /b %EXITCODE%

:log
echo [%date% %time%] %~1
echo [%date% %time%] %~1>>"%LOGFILE%"
exit /b 0
