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

  async get(key: string): Promise<any | null> {
    const db = getDb();
    const now = new Date();
    const record = await db.collection<RosterRecord>('roster').findOne({ key, expiresAt: { $gt: now } });
    return record ? record.value : null;
  }

  async set(key: string, value: any, expires: Date | number): Promise<void> {
    const db = getDb();
    const now = new Date();
    const expiresAt = this.toExpiresAt(expires);
    await db.collection<RosterRecord>('roster').updateOne(
      { key },
      { $set: { value, expiresAt, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
  }

  async setExpires(key: string, expires: Date | number): Promise<void> {
    const db = getDb();
    const now = new Date();
    const expiresAt = this.toExpiresAt(expires);
    await db.collection<RosterRecord>('roster').updateOne(
      { key },
      { $set: { expiresAt, updatedAt: now } }
    );
  }

  async delete(key: string): Promise<void> {
    const db = getDb();
    await db.collection<RosterRecord>('roster').deleteOne({ key });
  }

  async cleanup(beforeDate?: Date): Promise<number> {
    const db = getDb();
    const cutoff = beforeDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db.collection<RosterRecord>('roster').deleteMany({ expiresAt: { $lt: cutoff } });
    return result.deletedCount || 0;
  }
}

export const roster = new Roster();
