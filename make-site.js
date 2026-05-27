import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 清空目录
async function drop(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

// 复制文件夹
async function copy(src, dest) {
  await fs.cp(src, dest, { recursive: true, force: true });
}

// 复制单个文件
async function copyFile(src, dest) {
  await fs.copyFile(src, dest);
}

// 主构建
(async () => {
  const root = __dirname;
  const site = path.join(root, 'site');
  const serv = path.join(root, 'hongs-form-api/server');

  console.log('📦 开始构建完整部署包...');

  // 1. 删除旧 site
  await drop(site);

  // ==============================================
  // 2. 复制后端服务 dist + 必须的 package 文件
  // ==============================================

  // 复制 dist
  await copy(
    path.join(serv, 'dist'),
    path.join(site, 'dist'),
  );

  // 配置文件
  await copyFile(
    path.join(serv, '.env.example'),
    path.join(site, '.env.example')
  );

  // 复制 package.json【关键】
  await copyFile(
    path.join(serv, 'package.json'),
    path.join(site, 'package.json')
  );

  // ==============================================
  // 3. 复制所有前端 + 静态资源
  // ==============================================

  // 公共资源
  await copy(
    path.join(serv, 'public'),
    path.join(site, 'public'),
  );

  // 后台管理
  await copy(
    path.join(root, 'hongs-form-web/admin/dist'),
    path.join(site, 'public/admin')
  );
  // 客户平台
  await copy(
    path.join(root, 'hongs-form-web/agent/dist'),
    path.join(site, 'public/agent')
  );
  // 表单填报
  await copy(
    path.join(root, 'hongs-form-web/form/dist'),
    path.join(site, 'public/form')
  );

  console.log('✅ 构建完成！输出：site');
  console.log('🚀 服务器部署命令：');
  console.log('cd site');
  console.log('npm install --production');
  console.log('npm start');
})();