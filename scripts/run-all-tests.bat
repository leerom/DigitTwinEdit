@echo off
REM 快速验证脚本 - 运行所有测试 (Windows)
REM 使用方法: scripts\run-all-tests.bat

echo ========================================
echo 🧪 Running All Tests
echo ========================================
echo.

REM 测试 shared 包构建
echo 📦 Building shared package...
cd packages\shared
call pnpm build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Shared package built
) else (
    echo ✗ Shared package build failed
    exit /b 1
)
echo.
cd ..\..

REM 测试 server 包构建
echo 📦 Building server package...
cd packages\server
call pnpm build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Server package built
) else (
    echo ✗ Server package build failed
    exit /b 1
)
echo.

REM 运行后端测试
echo 🧪 Running backend tests...
call pnpm test
if %ERRORLEVEL% EQU 0 (
    echo ✓ Backend tests passed
) else (
    echo ✗ Backend tests failed
)
echo.
cd ..\..

REM 测试 client 包构建
echo 📦 Building client package...
cd packages\client
call pnpm build >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Client package built
) else (
    echo ✗ Client package build failed
    exit /b 1
)
echo.

REM 运行前端测试
echo 🧪 Running frontend tests...
call pnpm test --run
if %ERRORLEVEL% EQU 0 (
    echo ✓ Frontend tests passed
) else (
    echo ✗ Frontend tests failed (some tests may need backend)
)
echo.

cd ..\..

echo ========================================
echo ✅ All checks completed!
echo ========================================
echo.
echo 📋 Next steps:
echo   1. Start backend: cd packages\server ^&^& pnpm dev
echo   2. Start frontend: cd packages\client ^&^& pnpm dev
echo   3. Visit: http://localhost:5173
echo.
echo 🎯 To run E2E tests:
echo   1. Make sure backend is running
echo   2. cd packages\client ^&^& pnpm test:e2e
echo.
echo ========================================
pause
