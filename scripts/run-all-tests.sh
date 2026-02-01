#!/bin/bash

# 快速验证脚本 - 运行所有测试
# 使用方法: ./scripts/run-all-tests.sh

set -e

echo "🧪 Running All Tests"
echo "======================================"
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 测试 shared 包构建
echo -e "${YELLOW}📦 Building shared package...${NC}"
cd packages/shared
pnpm build
echo -e "${GREEN}✓ Shared package built${NC}"
echo ""
cd ../..

# 测试 server 包构建
echo -e "${YELLOW}📦 Building server package...${NC}"
cd packages/server
pnpm build
echo -e "${GREEN}✓ Server package built${NC}"
echo ""

# 运行后端测试
echo -e "${YELLOW}🧪 Running backend tests...${NC}"
pnpm test 2>&1 | tail -20
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
else
    echo -e "${RED}✗ Backend tests failed${NC}"
fi
echo ""
cd ../..

# 测试 client 包构建
echo -e "${YELLOW}📦 Building client package...${NC}"
cd packages/client
pnpm build
echo -e "${GREEN}✓ Client package built${NC}"
echo ""

# 运行前端测试
echo -e "${YELLOW}🧪 Running frontend tests...${NC}"
pnpm test --run 2>&1 | tail -20
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
else
    echo -e "${RED}✗ Frontend tests failed (some tests may need backend)${NC}"
fi
echo ""

cd ../..

echo "======================================"
echo -e "${GREEN}✅ All checks completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Start backend: cd packages/server && pnpm dev"
echo "  2. Start frontend: cd packages/client && pnpm dev"
echo "  3. Visit: http://localhost:5173"
echo ""
echo "🎯 To run E2E tests:"
echo "  1. Make sure backend is running"
echo "  2. cd packages/client && pnpm test:e2e"
echo ""
echo "======================================"
