@echo off
echo ==========================================
echo 简易 PostgreSQL 启动指南
echo ==========================================
echo.
echo 由于无法自动找到 PostgreSQL 安装，
echo 请尝试以下方法手动启动：
echo.
echo ==========================================
echo 方法1: 如果安装了完整版 PostgreSQL
echo ==========================================
echo.
echo 1. 按 Win+R，输入: services.msc
echo 2. 找到类似 "postgresql" 的服务
echo 3. 右键选择"启动"
echo.
echo 或者在命令行尝试:
echo    net start postgresql-x64-15
echo    net start postgresql-x64-16
echo    net start PostgreSQL
echo.
pause
echo.
echo ==========================================
echo 方法2: 如果使用便携版 PostgreSQL
echo ==========================================
echo.
echo 你需要手动运行 postgres.exe
echo 通常位于 PostgreSQL\bin\postgres.exe
echo.
echo 示例:
echo    "C:\PostgreSQL\15\bin\postgres.exe" -D "C:\PostgreSQL\15\data"
echo.
pause
echo.
echo ==========================================
echo 方法3: 使用 Docker (推荐)
echo ==========================================
echo.
echo 1. 安装 Docker Desktop:
echo    https://www.docker.com/products/docker-desktop/
echo.
echo 2. 运行:
echo    start-postgres-docker.bat
echo.
pause
echo.
echo ==========================================
echo 方法4: 临时解决方案
echo ==========================================
echo.
echo 如果以上都不行，我可以帮你:
echo   a) 配置使用 SQLite (无需 PostgreSQL)
echo   b) 使用在线 PostgreSQL 服务
echo   c) 仅测试前端 UI (Mock 数据)
echo.
echo 请告诉 Claude 你的选择！
echo.
pause
