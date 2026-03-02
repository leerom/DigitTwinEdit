@echo off
chcp 65001 >nul
echo ==========================================
echo DigitTwinEdit 系统启动脚本
echo ==========================================
echo.

REM 第一步：启动 Docker Desktop
echo [步骤 1/4] 检查 Docker Desktop...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Docker Desktop 未运行，正在启动...
    echo.
    echo 请手动启动 Docker Desktop，然后按任意键继续...
    echo （如果 Docker Desktop 已经在启动中，请等待完全启动后再按键）
    pause >nul

    REM 等待 Docker 就绪
    :wait_docker
    echo 等待 Docker 就绪...
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        timeout /t 5 /nobreak >nul
        goto wait_docker
    )
)
echo ✓ Docker Desktop 已就绪
echo.

REM 第二步：启动 PostgreSQL 容器
echo [步骤 2/4] 启动 PostgreSQL 数据库...
call start-postgres-docker.bat
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PostgreSQL 启动失败！
    pause
    exit /b 1
)
echo.

REM 第三步：启动后端服务器（在新窗口）
echo [步骤 3/4] 启动后端服务器...
echo 正在新窗口中启动后端...
start "DigitTwinEdit Backend" cmd /k "cd /d %~dp0 && pnpm --filter server dev"
echo ✓ 后端服务器已在新窗口中启动
echo.

REM 等待后端启动
echo 等待后端服务启动（大约 5 秒）...
timeout /t 5 /nobreak >nul
echo.

REM 第四步：启动前端开发服务器（在新窗口）
echo [步骤 4/4] 启动前端开发服务器...
echo 正在新窗口中启动前端...
start "DigitTwinEdit Frontend" cmd /k "cd /d %~dp0 && pnpm --filter client dev"
echo ✓ 前端开发服务器已在新窗口中启动
echo.

echo ==========================================
echo ✓ 系统启动完成！
echo ==========================================
echo.
echo 服务地址：
echo   前端：http://localhost:5173
echo   后端：http://localhost:3001
echo.
echo 等待服务完全启动（大约 10-15 秒）...
echo 然后在浏览器中访问：http://localhost:5173
echo.
echo 提示：
echo   - 两个服务都在独立窗口中运行
echo   - 关闭窗口将停止对应的服务
echo   - 按 Ctrl+C 可以停止服务
echo.
pause
