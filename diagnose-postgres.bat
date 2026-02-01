@echo off
echo ==========================================
echo PostgreSQL 诊断工具
echo ==========================================
echo.

echo [1/5] 检查 psql 命令...
psql --version 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ psql 命令可用
    for /f "tokens=*" %%i in ('where psql 2^>nul') do echo    路径: %%i
) else (
    echo ❌ psql 命令不可用
)
echo.

echo [2/5] 检查 PostgreSQL 服务...
sc query state= all | findstr /i postgres
echo.

echo [3/5] 检查 5432 端口...
netstat -ano | findstr :5432
if %ERRORLEVEL% EQU 0 (
    echo ✓ 5432端口有进程监听
) else (
    echo ❌ 5432端口无监听进程
)
echo.

echo [4/5] 测试数据库连接...
psql -U postgres -d digittwinedit -c "SELECT 1;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ 数据库连接成功
) else (
    echo ❌ 数据库连接失败
)
echo.

echo [5/5] 检查 Docker...
docker --version 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Docker 已安装
    docker ps 2>nul | findstr postgres
    if %ERRORLEVEL% EQU 0 (
        echo ✓ PostgreSQL容器正在运行
    ) else (
        echo ⚠ PostgreSQL容器未运行
    )
) else (
    echo ❌ Docker 未安装
)
echo.

echo ==========================================
echo 诊断完成
echo ==========================================
echo.
echo 建议:
echo.
echo 如果 psql 可用但端口5432无监听:
echo   → PostgreSQL已安装但服务未启动
echo   → 尝试: sc query state= all ^| findstr /i postgres
echo   → 然后: net start [服务名]
echo.
echo 如果 Docker 可用:
echo   → 运行: start-postgres-docker.bat
echo.
echo 如果都不可用:
echo   → 安装Docker Desktop (推荐)
echo   → 或重新安装PostgreSQL
echo.
pause
