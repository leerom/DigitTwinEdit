@echo off
echo ==========================================
echo Running Database Migration Scripts
echo ==========================================
echo.

echo Step 1: Running initial migration (001_initial.sql)...
psql -U postgres -d digittwinedit -f packages\server\migrations\001_initial.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Initial migration failed!
    pause
    exit /b 1
)
echo ✓ Initial migration completed
echo.

echo Step 2: Running assets table migration (002_create_assets_table.sql)...
psql -U postgres -d digittwinedit -f packages\server\migrations\002_create_assets_table.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Assets migration failed!
    pause
    exit /b 1
)
echo ✓ Assets migration completed
echo.

echo Step 3: Verifying tables...
psql -U postgres -d digittwinedit -c "\dt"
echo.

echo ==========================================
echo ✓ All migrations completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. Start backend: pnpm --filter server dev
echo 2. Open frontend: http://localhost:5173
echo 3. Test with Chrome DevTools
echo.
pause
