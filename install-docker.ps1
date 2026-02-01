# Docker Desktop 自动安装脚本
Write-Host "=========================================="
Write-Host "Docker Desktop 安装向导"
Write-Host "=========================================="
Write-Host ""

# 检查是否已安装
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerPath) {
    Write-Host "✓ Docker Desktop 已安装" -ForegroundColor Green
    Write-Host ""
    Write-Host "是否要启动 Docker Desktop? (Y/N)"
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        Start-Process $dockerPath
        Write-Host "Docker Desktop 正在启动..."
        Write-Host "请等待托盘图标变为绿色"
    }
    exit 0
}

Write-Host "Docker Desktop 未安装" -ForegroundColor Yellow
Write-Host ""
Write-Host "准备下载 Docker Desktop..."
Write-Host ""

# 下载路径
$installerPath = "$env:USERPROFILE\Desktop\DockerDesktopInstaller.exe"

Write-Host "下载位置: $installerPath"
Write-Host ""

# 下载
Write-Host "正在下载 Docker Desktop (约500MB)..."
Write-Host "这可能需要几分钟，请耐心等待..."
Write-Host ""

try {
    $url = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    Invoke-WebRequest -Uri $url -OutFile $installerPath -UseBasicParsing
    Write-Host "✓ 下载完成" -ForegroundColor Green
} catch {
    Write-Host "❌ 下载失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动下载:"
    Write-Host "https://www.docker.com/products/docker-desktop/"
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "=========================================="
Write-Host "准备安装"
Write-Host "=========================================="
Write-Host ""
Write-Host "安装程序已保存到桌面"
Write-Host ""
Write-Host "按任意键启动安装程序..."
pause

# 启动安装程序
Start-Process $installerPath -Wait

Write-Host ""
Write-Host "=========================================="
Write-Host "安装完成"
Write-Host "=========================================="
Write-Host ""
Write-Host "重要提示:"
Write-Host "1. 电脑将重启以完成安装"
Write-Host "2. 重启后，Docker Desktop 会自动启动"
Write-Host "3. 等待托盘图标变为绿色"
Write-Host "4. 然后运行: start-postgres-docker.bat"
Write-Host ""
pause
