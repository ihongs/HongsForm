# Docker Compose 部署指南

## 目录结构

```
d:\Workspace\HongsForm\
├── docker\
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── nginx.conf
├── site\                    # 前端打包目录（临时构建）
│   ├── public\              # 网站根目录
│   │   ├── admin\
│   │   ├── agent\
│   │   ├── form\
│   │   ├── static\
│   │   └── upload\
│   ├── dist\                # API 服务端代码
│   └── package.json
└── Docs\
    └── Docker-Deploy.md     # 本文档
```

## 一键部署

```bash
cd docker
docker-compose up -d
```

## 服务说明

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| nginx | nginx:alpine | 80 | HTTP 服务器 |
| api-server | (自定义) | 内部 3000 | Node API 服务 |
| mongodb | mongo:7.0 | 内部 27017 | 数据库 |

## 访问地址

- 主页: http://localhost
- Admin 管理后台: http://localhost/admin
- Agent 用户端: http://localhost/agent
- Form 表单端: http://localhost/form
- API 接口: http://localhost/api/

## 初始化数据

首次部署后初始化数据库：

```bash
docker-compose exec api-server node dist/scripts/test-init.js
```

## 常用命令

```bash
# 启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 重启
docker-compose restart

# 清理数据（慎用）
docker-compose down -v
```

## 数据持久化

- MongoDB: Docker volume `mongodb_data`
- 上传文件: `./site/public/upload` 目录

## 注意事项

1. site 目录为临时构建的前端资源
2. 生产环境建议配置 SSL/TLS
3. 生产环境建议配置 MongoDB 认证