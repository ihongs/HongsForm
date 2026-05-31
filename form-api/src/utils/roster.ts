import { getDb } from './db.js';

interface RosterRecord {
  key: string;
  value?: any;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

class Roster {
  private toExpiresAt(expires: Date | number): Date {
    if (expires instanceof Date) return expires;
    return new Date(Date.now() + expires * 1000);
  }

  // 获取记录 {value, expiresAt, createdAt, updatedAt}
  async getRecord(key: string): Promise<RosterRecord | null> {
    const db = getDb();
    const now = new Date();
    const record = await db.collection<RosterRecord>('records').findOne({ key, expiresAt: { $gt: now } });
    return record ? record : null;
  }

  // 获取记录并删除 {value, expiresAt, createdAt, updatedAt}
  async getRecordAndRemove(key: string): Promise<RosterRecord | null> {
    const record = await this.getRecord(key);
    if (! record) return null;
    await this.remove(key);
    return record;
  }

  // 获取值
  async get(key: string): Promise<any | null> {
    const record = await this.getRecord(key);
    return record ? record.value : null;
  }

  // 获取值并删除
  async getAndRemove(key: string): Promise<any | null> {
    const record = await this.getRecordAndRemove(key);
    return record ? record.value : null;
  }

  // 设置值和有效期
  // expires 为 Date 表示到期时间
  // expires 为 number 表示多少秒后失效
  async set(key: string, value: any, expires: Date | number): Promise<void> {
    const db = getDb();
    const now = new Date();
    const expiresAt = this.toExpiresAt(expires);
    await db.collection<RosterRecord>('records').updateOne(
      { key },
      { $set: { value, expiresAt, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
  }

  // 删除记录
  async remove(key: string): Promise<void> {
    const db = getDb();
    await db.collection<RosterRecord>('records').deleteOne({ key });
  }

  // 清理过期记录，默认清理 7 天前记录
  async cleanup(beforeDate?: Date): Promise<number> {
    const db = getDb();
    const cutoff = beforeDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db.collection<RosterRecord>('records').deleteMany({ expiresAt: { $lt: cutoff } });
    return result.deletedCount || 0;
  }
}

export const roster = new Roster();
