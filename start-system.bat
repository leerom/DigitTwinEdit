@echo off
echo ==========================================
echo Complete System Startup Guide
echo ==========================================
echo.

echo This will start the complete DigitTwinEdit system
echo.
echo Prerequisites:
echo ✓ PostgreSQL installed
echo ✓ Database 'digittwinedit' created
echo ✓ Migrations run (001_initial.sql, 002_create_assets_table.sql)
echo.

echo ==========================================
echo Step 1: Start Backend Server
echo ==========================================
echo.
echo Open a NEW terminal window and run:
echo   start-backend.bat
echo.
echo Wait for this message:
echo   🚀 Server running on http://localhost:3001
echo.
pause

echo ==========================================
echo Step 2: Verify Backend
echo ==========================================
echo.
echo Testing backend health endpoint...
curl http://localhost:3001/health
echo.
echo.
pause

echo ==========================================
echo Step 3: Frontend is Already Running
echo ==========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo ==========================================
echo System Ready!
echo ==========================================
echo.
echo Next steps:
echo 1. Open http://localhost:5173 in Chrome
echo 2. Open DevTools (F12)
echo 3. Register a new user
echo 4. Create a project
echo 5. Test asset upload
echo.
pause
