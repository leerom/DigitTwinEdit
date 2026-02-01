-- =====================================================
-- 数据库用户和权限配置
-- =====================================================
-- 执行方式: psql -U postgres -d digittwinedit -f packages/server/migrations/000_setup_user.sql

-- 创建用户（如果密码需要修改，请修改此处）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'digittwinedit') THEN
    CREATE USER digittwinedit WITH PASSWORD 'password';
  END IF;
END
$$;

-- 授予数据库权限
GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit;

-- 授予schema权限
GRANT ALL ON SCHEMA public TO digittwinedit;

-- 授予未来表的权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO digittwinedit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO digittwinedit;

-- 验证
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'digittwinedit';
