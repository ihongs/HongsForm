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
  const serv = path.join(root, 'form-api');

  console.log('📦 开始构建完整部署包...');

  // 1. 删除旧 site
  await drop(site);
  console.log('   删除旧 site');

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
  
  console.log('   构建新 site');

  // 内部资源
  await copy(
    path.join(serv, 'server'),
    path.join(site, 'server'),
  );
  console.log('   复制 server');

  // 公共资源
  await copy(
    path.join(serv, 'public'),
    path.join(site, 'public'),
  );
  console.log('   复制 public');

  // ==============================================
  // 3. 复制所有前端 + 静态资源
  // ==============================================

  // 清空并重建 upload 目录
  const uploadDir = path.join(site, 'public/upload');
  await fs.rm(uploadDir, { recursive: true, force: true });
  await fs.mkdir(uploadDir, { recursive: true });
  console.log('   建立 public/upload');

  // 后台管理
  await copy(
    path.join(root, 'form-web/admin/dist'),
    path.join(site, 'public/admin')
  );
  console.log('   复制 public/admin');

  // 客户平台
  await copy(
    path.join(root, 'form-web/agent/dist'),
    path.join(site, 'public/agent')
  );
  console.log('   复制 public/agent');

  // 表单填报
  await copy(
    path.join(root, 'form-web/form/dist'),
    path.join(site, 'public/form')
  );
  console.log('   复制 public/form');

  // ==============================================
  // 3. 复制 docker 相关文件
  // ==============================================
  
  const dockerSrc = path.join(root, 'docker');
  const dockerFiles = await fs.readdir(dockerSrc);
  for (const file of dockerFiles) {
    const srcFile = path.join(dockerSrc, file);
    const destFile = path.join(site, file);
    await copyFile(srcFile, destFile);
  }
  console.log('   复制 docker');

  console.log('✅ 构建完成！输出：site');
  console.log('==================================================');
  console.log('🚀 Node.js 部署命令：');
  console.log('==================================================');
  console.log('cd site');
  console.log('npm install --production');
  console.log('npm start');
  console.log('==================================================');
  console.log('🐳 Docker Compose 部署命令');
  console.log('==================================================');
  console.log('cd site');
  console.log('docker-compose up -d');
  console.log('');
  console.log('📋 初始化数据库：');
  console.log('docker-compose exec api-server node dist/scripts/test-init.js');
  console.log('');
  console.log('🔧 常用维护命令：');
  console.log('docker-compose ps          # 查看状态');
  console.log('docker-compose logs -f     # 查看日志');
  console.log('docker-compose down        # 停止服务');
  console.log('docker-compose down -v     # 清理数据');
})();