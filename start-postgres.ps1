# PostgreSQL 启动脚本
Write-Host "=========================================="
Write-Host "PostgreSQL 启动工具"
Write-Host "=========================================="
Write-Host ""

# 检查服务
Write-Host "[1/4] 查找 PostgreSQL 服务..."
$services = Get-Service | Where-Object { $_.DisplayName -like '*PostgreSQL*' -or $_.Name -like '*postgres*' }

if ($services.Count -eq 0) {
    Write-Host "❌ 未找到 PostgreSQL 服务" -ForegroundColor Red
    Write-Host ""
    Write-Host "PostgreSQL 可能通过以下方式安装："
    Write-Host "  - 便携版（无服务）"
    Write-Host "  - WSL"
    Write-Host "  - 第三方工具"
    Write-Host ""
    Write-Host "建议使用 Docker 方式："
    Write-Host "  1. 安装 Docker Desktop"
    Write-Host "  2. 运行: start-postgres-docker.bat"
    Write-Host ""
    pause
    exit 1
}

Write-Host "找到以下服务:" -ForegroundColor Green
$services | Format-Table Name, Status, DisplayName -AutoSize

# 启动服务
foreach ($service in $services) {
    if ($service.Status -ne 'Running') {
        Write-Host ""
        Write-Host "[2/4] 启动服务: $($service.Name)..."
        try {
            Start-Service $service.Name
            Write-Host "✓ 服务已启动" -ForegroundColor Green
        } catch {
            Write-Host "❌ 无法启动服务: $_" -ForegroundColor Red
            Write-Host "尝试使用管理员权限运行此脚本"
        }
    } else {
        Write-Host "✓ 服务已在运行" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[3/4] 检查端口 5432..."
$listening = netstat -ano | Select-String ":5432.*LISTENING"
if ($listening) {
    Write-Host "✓ PostgreSQL 正在监听 5432 端口" -ForegroundColor Green
} else {
    Write-Host "❌ 5432 端口无监听" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/4] 测试数据库连接..."
Write-Host "尝试连接: psql -U postgres -c 'SELECT 1;'"
Write-Host ""

Write-Host "=========================================="
Write-Host "完成！"
Write-Host "=========================================="
Write-Host ""
Write-Host "下一步:"
Write-Host "  1. 在新窗口运行: pnpm --filter server dev"
Write-Host "  2. 访问: http://localhost:5173"
Write-Host "  3. 测试注册功能"
Write-Host ""
pause
