@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Change to the directory of this script
cd /d %~dp0

echo [1/4] Ensuring Postgres (Docker) is running...
docker compose up -d

echo [2/4] Waiting for Postgres to become healthy...
set PGSTATUS=
:wait_pg
for /f "usebackq delims=" %%i in (`docker inspect -f "{{.State.Health.Status}}" roster-postgres 2^>NUL`) do set PGSTATUS=%%i
if /i "%PGSTATUS%" NEQ "healthy" (
  echo   current: %PGSTATUS% ... retrying in 2s
  timeout /t 2 >nul
  goto wait_pg
)

echo [3/4] Generating Prisma client and syncing schema...
cmd /c "cd /d %~dp0server && npx prisma generate && npm run db:push"

echo [4/4] Starting API and Web...
start "API (server)" cmd /k "cd /d %~dp0server && npm run dev"
start "Web (vite)"   cmd /k "cd /d %~dp0 && npm run dev"

echo Done. Two terminals should open: API and Web.
endlocal
