# Agent 认证与 Roster 表实施计划

## 1. 概述

本次实施计划包括以下功能：

1. Roster 键值存储表
2. 邮箱/手机验证码服务
3. Agent 登录/注册一体服务
4. 邮件发送功能
5. 短信发送功能（空实现）
6. Record 清理脚本

***

## 2. 代码库分析结论

* 项目已有的功能：

* MongoDB 数据库，已有 user 集合

* 已有认证系统（JWT-like Token 生成与验证

* JSON-RPC 2.0 架构

* 用户认证系统

* 用户管理 API

***

## 3. 实施步骤

### 3.1 Roster 表设计与封装

#### 数据库：

* 表名：`roster`

* 字段：

  * `_id` (ObjectId)

  * `key` (String) - 键，唯一索引

  * `value` (Any) - 值

  * `expiresAt` (Date) - 过期时间，索引

  * `createdAt` (Date)

  * `updatedAt` (Date)

#### 修改文件：

1. \`doc/database.md - 添加 roster 表文档
2. hongs-form-api/server/src/utils/db.ts - 添加 roster 索引初始化
3. hongs-form-api/server/src/utils/roster.ts - 封装 roster 操作方法

### 3.2 环境变量更新

#### 修改文件：

1. hongs-form-api/server/.env.example - 添加邮件相关环境变量

### 3.3 邮件发送功能

#### 修改文件：

1. hongs-form-api/server/src/utils/email.ts - 实现邮件发送

### 3.4 短信发送功能

#### 修改文件：

1. hongs-form-api/server/src/utils/sms.ts - 空实现短信发送

### 3.5 Agent 认证 API

#### 修改文件：

1. hongs-form-api/server/src/api/rpc/shared/users.ts - 添加验证码发送和登录/注册一体方法
2. hongs-form-api/server/src/api/rpc/scopes/agent/methods/auth.ts - 注册 agent 认证方法
3. hongs-form-api/server/src/api/rpc/scopes/agent/registry.ts - 确保方法已注册

### 3.6 Record 清理脚本

#### 修改文件：

1. hongs-form-api/server/scripts/cleanup-roster.ts - 实现清理脚本
2. hongs-form-api/server/package.json - 添加清理脚本命令

***

## 4. 具体修改文件清单

| 文件路径                                                           | 操作类型 | 说明              |
| -------------------------------------------------------------- | ---- | --------------- |
| doc/database.md                                                | 编辑   | 添加 roster 表文档   |
| hongs-form-api/server/src/utils/db.ts                          | 编辑   | 添加 roster 索引初始化 |
| hongs-form-api/server/src/utils/roster.ts                      | 新建   | 封装 roster 操作    |
| hongs-form-api/server/src/utils/email.ts                       | 新建   | 邮件发送            |
| hongs-form-api/server/src/utils/sms.ts                         | 新建   | 短信发送            |
| hongs-form-api/server/src/api/rpc/shared/users.ts              | 编辑   | 添加认证相关方法        |
| hongs-form-api/server/src/api/rpc/scopes/agent/methods/auth.ts | 编辑   | 注册认证方法          |
| hongs-form-api/server/scripts/cleanup-roster.ts                | 新建   | 清理过期 record 脚本  |
| hongs-form-api/server/package.json                             | 编辑   | 添加脚本命令          |
| hongs-form-api/server/.env.example                             | 编辑   | 添加邮件配置          |

