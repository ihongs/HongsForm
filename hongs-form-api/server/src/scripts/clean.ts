import { connectDb, closeDb } from '../utils/db.js';
import { roster } from '../utils/roster.js';
import { loadEnv } from '../utils/env.js';

async function main() {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI || 'mongodb://localhost:27017/hongs_form');

  // 清理过期记录
  const count = await roster.cleanup();
  console.log(`Cleaned up ${count} expired roster records`);

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
