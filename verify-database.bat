@echo off
echo ==========================================
echo Verifying Database Tables
echo ==========================================
echo.

psql -U postgres -d digittwinedit -c "\dt"

echo.
echo ==========================================
echo Table Details
echo ==========================================
echo.

echo Checking users table...
psql -U postgres -d digittwinedit -c "\d users"
echo.

echo Checking projects table...
psql -U postgres -d digittwinedit -c "\d projects"
echo.

echo Checking scenes table...
psql -U postgres -d digittwinedit -c "\d scenes"
echo.

echo Checking assets table...
psql -U postgres -d digittwinedit -c "\d assets"
echo.

echo ==========================================
echo ✓ Database verification complete!
echo ==========================================
pause
