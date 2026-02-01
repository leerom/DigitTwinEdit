@echo off
REM 后台服务与登录系统 - 一键启动脚本 (Windows)
REM 使用方法: scripts\start-dev.bat

echo ========================================
echo 🚀 Digital Twin Editor - 启动开发环境
echo ========================================
echo.

REM 检查 PostgreSQL
echo 检查 PostgreSQL...
pg_isready >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ PostgreSQL 运行中
) else (
    echo ✗ PostgreSQL 未运行
    echo 请先启动 PostgreSQL 服务
    pause
    exit /b 1
)

REM 检查数据库
echo 检查数据库...
psql -U postgres -lqt | findstr /C:"digittwinedit" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ digittwinedit 数据库已存在
) else (
    echo ! 数据库不存在，正在创建...
    createdb digittwinedit
    echo ✓ 数据库创建成功

    echo 正在运行迁移脚本...
    psql digittwinedit < packages\server\migrations\001_initial.sql
    echo ✓ 迁移完成
)

REM 检查 .env 文件
echo 检查后端配置...
if exist "packages\server\.env" (
    echo ✓ .env 文件存在
) else (
    echo ! .env 文件不存在
    echo 正在从示例文件创建...
    copy packages\server\.env.example packages\server\.env
    echo.
    echo ⚠ 请编辑 packages\server\.env 并设置正确的配置
    echo   特别是 DATABASE_URL 和 SESSION_SECRET
    echo.
    pause
    exit /b 1
)

REM 检查依赖
echo 检查依赖...
if exist "node_modules" (
    echo ✓ 依赖已安装
) else (
    echo ! 依赖未安装，正在安装...
    pnpm install
    echo ✓ 依赖安装完成
)

REM 构建 shared 包
echo 构建共享包...
cd packages\shared
call pnpm build >nul 2>&1
echo ✓ 完成
cd ..\..

echo.
echo ========================================
echo ✅ 环境检查完成！
echo ========================================
echo.
echo 🎯 启动说明:
echo ========================================
echo.
echo 请打开两个命令提示符窗口，分别运行:
echo.
echo 终端1 (后端):
echo   cd packages\server
echo   pnpm dev
echo.
echo 终端2 (前端):
echo   cd packages\client
echo   pnpm dev
echo.
echo 然后访问: http://localhost:5173
echo.
echo ========================================
pause
