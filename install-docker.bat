@echo off
echo ==========================================
echo Docker Desktop 安装向导
echo ==========================================
echo.
echo 此脚本会:
echo 1. 检查 Docker 是否已安装
echo 2. 下载 Docker Desktop (约500MB)
echo 3. 启动安装程序
echo.
echo 按任意键继续...
pause >nul
echo.

powershell -ExecutionPolicy Bypass -File install-docker.ps1
