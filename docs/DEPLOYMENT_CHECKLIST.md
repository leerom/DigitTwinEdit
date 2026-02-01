# 🚀 生产部署检查清单

在部署到生产环境之前，请完成以下检查。

## ⚙️ 环境准备

### 服务器要求
- [ ] Node.js >= 18.x 已安装
- [ ] PostgreSQL >= 13.x 已安装并运行
- [ ] 足够的磁盘空间 (至少 1GB)
- [ ] 足够的内存 (至少 2GB RAM)

### 域名和 SSL
- [ ] 域名已配置 (如 digittwinedit.example.com)
- [ ] SSL 证书已获取 (Let's Encrypt 或其他)
- [ ] DNS 记录已设置

## 🗄️ 数据库设置

### 创建生产数据库
```bash
# 创建数据库
createdb digittwinedit_prod

# 创建专用用户 (推荐)
psql -U postgres << EOF
CREATE USER digittwinedit_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE digittwinedit_prod TO digittwinedit_user;
EOF

# 运行迁移
psql -U digittwinedit_user digittwinedit_prod < packages/server/migrations/001_initial.sql
```

### 数据库优化
- [ ] 设置合理的连接池大小
- [ ] 配置自动备份
- [ ] 设置慢查询日志
- [ ] 创建监控告警

## 🔐 安全配置

### 后端安全

1. **生成强密钥**:
```bash
# SESSION_SECRET (至少 32 字节)
openssl rand -hex 32

# 数据库密码 (至少 16 字符)
openssl rand -base64 16
```

2. **环境变量** (`packages/server/.env.production`):
```env
NODE_ENV=production
DATABASE_URL=postgresql://digittwinedit_user:SECURE_PASSWORD@localhost:5432/digittwinedit_prod
SESSION_SECRET=YOUR_GENERATED_SECRET_HERE
PORT=3001
CORS_ORIGIN=https://your-domain.com
```

3. **安全加固检查清单**:
- [ ] SESSION_SECRET 已更换为随机值
- [ ] 数据库密码足够强
- [ ] CORS_ORIGIN 设置为实际域名
- [ ] 生产环境 cookie.secure = true
- [ ] 禁用详细错误信息输出

### 前端配置

**环境变量** (`packages/client/.env.production`):
```env
VITE_API_URL=https://api.your-domain.com/api
```

### 防火墙
- [ ] 仅开放必要端口 (80, 443, 3001)
- [ ] 数据库端口仅本地访问
- [ ] SSH 端口更改或使用密钥认证

## 📦 构建生产版本

```bash
# 从项目根目录
pnpm build

# 验证构建产物
ls -lh packages/shared/dist
ls -lh packages/server/dist
ls -lh packages/client/dist
```

检查点:
- [ ] shared/dist 包含类型定义文件
- [ ] server/dist 包含编译后的 .js 文件
- [ ] client/dist 包含静态资源 (index.html, assets/)

## 🚀 部署后端

### 方式1: 直接运行 (简单)

```bash
cd packages/server

# 设置环境变量
export NODE_ENV=production

# 启动服务
node dist/app.js
```

### 方式2: 使用 PM2 (推荐)

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd packages/server
pm2 start dist/app.js --name digittwinedit-api

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs digittwinedit-api

# 监控
pm2 monit
```

### 方式3: 使用 systemd (Linux)

创建 `/etc/systemd/system/digittwinedit.service`:
```ini
[Unit]
Description=Digital Twin Editor API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/digittwinedit/packages/server
EnvironmentFile=/var/www/digittwinedit/packages/server/.env
ExecStart=/usr/bin/node dist/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl enable digittwinedit
sudo systemctl start digittwinedit
sudo systemctl status digittwinedit
```

## 🌐 部署前端

### 方式1: Nginx (推荐)

**Nginx 配置** (`/etc/nginx/sites-available/digittwinedit`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    root /var/www/digittwinedit/packages/client/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

启动 Nginx:
```bash
sudo nginx -t                          # 测试配置
sudo ln -s /etc/nginx/sites-available/digittwinedit /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### 方式2: Apache

略 (类似配置)

### 方式3: Docker (推荐用于一致性)

创建 `docker-compose.yml`:
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: digittwinedit
      POSTGRES_USER: digittwinedit
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build:
      context: ./packages/server
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://digittwinedit:${DB_PASSWORD}@db:5432/digittwinedit
      SESSION_SECRET: ${SESSION_SECRET}
      PORT: 3001
    depends_on:
      - db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./packages/client/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🔍 部署后验证

### 健康检查

```bash
# 检查后端
curl https://your-domain.com/api/auth/me

# 检查前端
curl https://your-domain.com

# 检查数据库连接
psql -U digittwinedit_user digittwinedit_prod -c "SELECT COUNT(*) FROM users;"
```

### 日志检查
```bash
# PM2 日志
pm2 logs digittwinedit-api

# systemd 日志
sudo journalctl -u digittwinedit -f

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 性能监控
- [ ] 设置 CPU/内存监控
- [ ] 设置磁盘空间告警
- [ ] 设置数据库连接监控
- [ ] 设置 API 响应时间监控

## 🔒 安全加固

### SSL/TLS
- [ ] 使用 HTTPS (SSL 证书)
- [ ] HTTP 自动重定向到 HTTPS
- [ ] 设置 HSTS 头
- [ ] 禁用旧的 TLS 版本

### HTTP 安全头
在 nginx 配置中添加:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

### 数据库安全
- [ ] 使用强密码
- [ ] 限制网络访问 (仅本地)
- [ ] 定期备份
- [ ] 启用查询日志

### 应用安全
- [ ] 设置 CSRF 保护
- [ ] 添加请求速率限制
- [ ] 实施 IP 白名单 (如需要)
- [ ] 启用访问日志

## 📊 性能优化

### 后端优化
- [ ] 数据库连接池优化
- [ ] Redis Session 存储 (可选)
- [ ] API 响应缓存
- [ ] 启用 gzip 压缩

### 前端优化
- [ ] 启用 CDN (可选)
- [ ] 压缩静态资源
- [ ] 浏览器缓存策略
- [ ] 代码分割优化

### 数据库优化
- [ ] 创建必要索引 (已完成)
- [ ] 定期 VACUUM
- [ ] 查询性能分析
- [ ] 慢查询优化

## 💾 备份策略

### 数据库备份
```bash
# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/var/backups/digittwinedit"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
pg_dump -U digittwinedit_user digittwinedit_prod > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

添加到 crontab:
```bash
# 每天凌晨2点备份
0 2 * * * /path/to/backup-script.sh
```

### 代码备份
- [ ] 使用 Git 版本控制
- [ ] 定期推送到远程仓库
- [ ] 标记重要版本 (git tag)

## 📈 监控和告警

### 推荐工具
- **性能监控**: PM2 / New Relic / Datadog
- **错误追踪**: Sentry
- **日志管理**: Winston / Pino
- **可用性监控**: UptimeRobot / Pingdom

### 关键指标
- [ ] API 响应时间 < 200ms
- [ ] 数据库查询时间 < 50ms
- [ ] 内存使用率 < 80%
- [ ] CPU 使用率 < 70%
- [ ] 磁盘使用率 < 80%

## ✅ 部署完成检查

### 功能测试
- [ ] 用户可以注册
- [ ] 用户可以登录
- [ ] 用户可以创建项目
- [ ] 用户可以切换场景
- [ ] 场景数据自动保存
- [ ] 刷新页面数据保持
- [ ] 用户可以登出

### 性能测试
- [ ] 页面加载时间 < 3秒
- [ ] API 响应时间 < 500ms
- [ ] 并发100用户无问题

### 安全测试
- [ ] HTTPS 工作正常
- [ ] Session 安全
- [ ] SQL 注入防护
- [ ] XSS 防护

## 🎯 上线后

### 第一周
- [ ] 每天检查日志
- [ ] 监控性能指标
- [ ] 收集用户反馈
- [ ] 修复紧急问题

### 持续维护
- [ ] 定期备份验证
- [ ] 安全补丁更新
- [ ] 性能优化调整
- [ ] 功能迭代

---

## 📞 紧急联系

### 问题排查
1. 检查服务状态: `systemctl status digittwinedit`
2. 查看日志: `pm2 logs` 或 `journalctl -u digittwinedit`
3. 检查数据库: `psql digittwinedit_prod`
4. 重启服务: `pm2 restart all` 或 `systemctl restart digittwinedit`

### 回滚计划
```bash
# 1. 停止服务
pm2 stop digittwinedit-api

# 2. 切换到之前的版本
git checkout previous-version
pnpm build

# 3. 恢复数据库备份 (如需要)
psql digittwinedit_prod < /var/backups/digittwinedit/backup_YYYYMMDD.sql

# 4. 重启服务
pm2 restart digittwinedit-api
```

---

## 🎉 部署完成！

检查所有项目后，您的应用就可以正式上线了！

**祝贺！** 🚀🎊

---

*文档版本: 1.0*
*最后更新: 2026-02-01*
