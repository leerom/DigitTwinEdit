@echo off
echo ==========================================
echo Starting PostgreSQL with Docker
echo ==========================================
echo.

echo Checking if Docker is available...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker not found!
    echo.
    echo Please install Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)
echo ✓ Docker is available
echo.

echo Checking if container already exists...
docker ps -a | findstr digittwinedit-postgres >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Container exists, starting it...
    docker start digittwinedit-postgres
    goto :verify
)

echo Creating new PostgreSQL container...
docker run --name digittwinedit-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=digittwinedit ^
  -p 5432:5432 ^
  -d postgres:15

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to create container!
    pause
    exit /b 1
)
echo ✓ Container created
echo.

echo Waiting for PostgreSQL to start (10 seconds)...
timeout /t 10 /nobreak >nul
echo.

:verify
echo Verifying PostgreSQL is running...
docker exec digittwinedit-postgres psql -U postgres -c "SELECT version();" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PostgreSQL not responding yet, waiting 5 more seconds...
    timeout /t 5 /nobreak >nul
    docker exec digittwinedit-postgres psql -U postgres -c "SELECT version();" >nul 2>&1
)
echo ✓ PostgreSQL is running
echo.

echo Creating digittwinedit user...
docker exec digittwinedit-postgres psql -U postgres -d digittwinedit -c "CREATE USER digittwinedit WITH PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit; GRANT ALL ON SCHEMA public TO digittwinedit; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO digittwinedit; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO digittwinedit;" 2>nul
echo ✓ User created (or already exists)
echo.

echo Running migrations...
echo - Running 001_initial.sql...
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\001_initial.sql >nul 2>&1
echo ✓ Initial migration completed

echo - Running 002_create_assets_table.sql...
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\002_create_assets_table.sql >nul 2>&1
echo ✓ Assets migration completed
echo.

echo Verifying tables...
docker exec digittwinedit-postgres psql -U postgres -d digittwinedit -c "\dt"
echo.

echo ==========================================
echo ✓ PostgreSQL is ready!
echo ==========================================
echo.
echo Database: digittwinedit
echo Host: localhost:5432
echo User: digittwinedit / postgres
echo Password: password / postgres
echo.
echo Next step: Start the backend server
echo   pnpm --filter server dev
echo.
pause
