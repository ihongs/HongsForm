import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(uri: string): Promise<Db> {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  console.log('MongoDB connected successfully');

  // Initialize indexes
  await initIndexes(db);

  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected');
  return db;
}

async function initIndexes(db: Db) {
  // Users 集合索引
  const userCol = db.collection('users');
  await userCol.createIndex({ username: 1 }, { unique: true });
  await userCol.createIndex({ email: 1 });
  await userCol.createIndex({ phone: 1 });
  await userCol.createIndex({ role: 1 });
  await userCol.createIndex({ status: -1 });
  await userCol.createIndex({ createdAt: -1 });
  await userCol.createIndex({ deletedAt: 1 });

  // UserApiKeys 集合索引
  const userAuthCol = db.collection('userApiKeys');
  await userAuthCol.createIndex({ sk: 1 }, { unique: true });
  await userAuthCol.createIndex({ userId: 1 });
  await userAuthCol.createIndex({ expiresAt: 1 });
  await userAuthCol.createIndex({ deletedAt: 1 });

  // Forms 集合索引
  const formCol = db.collection('forms');
  await formCol.createIndex({ userId: 1 });
  await formCol.createIndex({ status: 1 });
  await formCol.createIndex({ publishedAt: -1 });
  await formCol.createIndex({ createdAt: -1 });
  await formCol.createIndex({ deletedAt: 1 });
  await formCol.createIndex({ name: 'text', title: 'text', description: 'text' });

  // FormRecords 集合索引
  const formDataCol = db.collection('formRecords');
  await formDataCol.createIndex({ formId: 1 });
  await formDataCol.createIndex({ formId: 1, userId: 1 }, { sparse: true });
  await formDataCol.createIndex({ dataHash: 1 }, { unique: true });
  await formDataCol.createIndex({ status: 1 });
  await formDataCol.createIndex({ deletedAt: 1 });
  await formDataCol.createIndex({ createdAt: -1 });
  await formDataCol.createIndex({ formId: 1, createdAt: -1 });
  await formDataCol.createIndex({ channel: 1 });

  // Records 集合索引
  const rosterCol = db.collection('records');
  await rosterCol.createIndex({ key: 1 }, { unique: true });
  await rosterCol.createIndex({ expiresAt: 1 });

  console.log('Database indexes initialized');
}
