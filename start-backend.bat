@echo off
echo ==========================================
echo Starting Backend Server
echo ==========================================
echo.

cd packages\server

echo Checking environment file...
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)
echo ✓ Environment file exists
echo.

echo Starting server with tsx...
echo Server will run on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

pnpm dev
