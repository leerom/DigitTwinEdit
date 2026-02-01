@echo off
color 0A
cls
echo.
echo ==========================================
echo   Docker Desktop 快速安装
echo ==========================================
echo.
echo 此工具会帮助你安装 Docker Desktop
echo.
echo 请选择安装方式:
echo.
echo [1] 自动下载并安装 (约500MB)
echo [2] 打开浏览器手动下载
echo [3] 查看安装说明
echo [4] 退出
echo.
set /p choice="请输入选择 (1-4): "

if "%choice%"=="1" goto auto_install
if "%choice%"=="2" goto manual_download
if "%choice%"=="3" goto show_guide
if "%choice%"=="4" exit

:auto_install
echo.
echo 开始自动下载...
powershell -ExecutionPolicy Bypass -File install-docker.ps1
goto end

:manual_download
echo.
echo 正在打开浏览器...
start https://www.docker.com/products/docker-desktop/
echo.
echo 下载完成后:
echo 1. 运行安装程序
echo 2. 勾选 "Use WSL 2"
echo 3. 完成后重启电脑
echo 4. 重启后运行: start-postgres-docker.bat
echo.
pause
goto end

:show_guide
type DOCKER_INSTALL_README.txt
pause
goto end

:end
echo.
echo ==========================================
echo 感谢使用!
echo ==========================================
echo.
