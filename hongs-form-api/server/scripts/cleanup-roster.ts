import { connectDb, closeDb } from '../src/utils/db.js';
import { roster } from '../src/utils/roster.js';
import { loadEnv } from '../src/utils/env.js';

async function main() {
  const env = loadEnv();
  await connectDb(env.MONGODB_URI || 'mongodb://localhost:27017/hongs_form');

  const deletedCount = await roster.cleanup();
  console.log(`Cleaned up ${deletedCount} expired roster records`);

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
