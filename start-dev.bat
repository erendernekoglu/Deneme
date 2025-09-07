@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Change to the directory of this script
cd /d %~dp0

echo [1/5] Starting Postgres (Docker)...
docker compose up -d

echo [2/5] Waiting for Postgres to become healthy...
set PGSTATUS=
:wait_pg
for /f "usebackq delims=" %%i in (`docker inspect -f "{{.State.Health.Status}}" roster-postgres 2^>NUL`) do set PGSTATUS=%%i
if /i "%PGSTATUS%" NEQ "healthy" (
  echo   current: %PGSTATUS% ... retrying in 2s
  timeout /t 2 >nul
  goto wait_pg
)

echo [3/5] Generating Prisma client and syncing schema...
cmd /c "cd /d %~dp0server && npx prisma generate && npm run db:push"

echo [4/5] Starting API server...
start "API (server)" cmd /k "cd /d %~dp0server && npm run dev"

echo [5/5] Waiting for API server to be ready on port 4000...
set APIREADY=
:wait_api
for /f "usebackq" %%i in (`netstat -an ^| findstr ":4000" ^| findstr "LISTENING"`) do set APIREADY=1
if not defined APIREADY (
  echo   API server not ready yet... retrying in 2s
  timeout /t 2 >nul
  goto wait_api
)

echo API server is ready! Starting Web client...
start "Web (vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo Done. Database, API server, and Web client should all be running.
endlocal