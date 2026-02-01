#!/bin/bash

# 后台服务与登录系统 - 一键启动脚本
# 使用方法: ./scripts/start-dev.sh

set -e

echo "🚀 Digital Twin Editor - 启动开发环境"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 PostgreSQL
echo -n "检查 PostgreSQL... "
if pg_isready &> /dev/null; then
    echo -e "${GREEN}✓ 运行中${NC}"
else
    echo -e "${RED}✗ 未运行${NC}"
    echo "请先启动 PostgreSQL: pg_ctl start"
    exit 1
fi

# 检查数据库是否存在
echo -n "检查数据库... "
if psql -lqt | cut -d \| -f 1 | grep -qw digittwinedit; then
    echo -e "${GREEN}✓ digittwinedit 已存在${NC}"
else
    echo -e "${YELLOW}! 数据库不存在${NC}"
    echo "正在创建数据库..."
    createdb digittwinedit
    echo -e "${GREEN}✓ 数据库创建成功${NC}"

    echo "正在运行迁移脚本..."
    psql digittwinedit < packages/server/migrations/001_initial.sql
    echo -e "${GREEN}✓ 迁移完成${NC}"
fi

# 检查 .env 文件
echo -n "检查后端配置... "
if [ -f "packages/server/.env" ]; then
    echo -e "${GREEN}✓ .env 文件存在${NC}"
else
    echo -e "${YELLOW}! .env 文件不存在${NC}"
    echo "正在从示例文件创建..."
    cp packages/server/.env.example packages/server/.env
    echo -e "${YELLOW}⚠ 请编辑 packages/server/.env 并设置正确的配置${NC}"
    echo "  特别是 DATABASE_URL 和 SESSION_SECRET"
    exit 1
fi

# 检查依赖
echo -n "检查依赖... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ 依赖已安装${NC}"
else
    echo -e "${YELLOW}! 依赖未安装${NC}"
    echo "正在安装依赖..."
    pnpm install
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
fi

# 构建 shared 包
echo -n "构建共享包... "
cd packages/shared
pnpm build &> /dev/null
echo -e "${GREEN}✓ 完成${NC}"
cd ../..

echo ""
echo -e "${GREEN}✅ 环境检查完成！${NC}"
echo ""
echo "======================================"
echo "🎯 启动说明:"
echo "======================================"
echo ""
echo "请打开两个终端窗口，分别运行:"
echo ""
echo -e "${YELLOW}终端1 (后端):${NC}"
echo "  cd packages/server"
echo "  pnpm dev"
echo ""
echo -e "${YELLOW}终端2 (前端):${NC}"
echo "  cd packages/client"
echo "  pnpm dev"
echo ""
echo "然后访问: ${GREEN}http://localhost:5173${NC}"
echo ""
echo "======================================"
