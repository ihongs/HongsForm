import { Db, Collection, ObjectId, Filter, OptionalUnlessRequiredId, WithId, UpdateFilter, FindOptions, FindCursor } from 'mongodb';
import { z } from 'zod';
import { findParse } from '../utils/finder.js';

export class BaseModel {
  protected db: Db;
  protected collectionName: string;
  protected createSchema?: z.ZodSchema<any>;
  protected updateSchema?: z.ZodSchema<any>;
  protected findSchema?: z.ZodSchema<any>;

  constructor(
    db: Db,
    collectionName: string,
    options?: {
      createSchema?: z.ZodSchema<any>;
      updateSchema?: z.ZodSchema<any>;
      findSchema?: z.ZodSchema<any>;
    }
  ) {
    this.db = db;
    this.collectionName = collectionName;
    this.createSchema = options?.createSchema;
    this.updateSchema = options?.updateSchema;
    this.findSchema = options?.findSchema;
  }

  protected get collection(): Collection {
    return this.db.collection(this.collectionName);
  }

  protected toObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }

  protected normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.normalizeValue(v));
    }
    if (value instanceof ObjectId || value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      if (ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value)) {
        try {
          return new ObjectId(value);
        } catch {
          return value;
        }
      }
      return value;
    }
    return value;
  }

  validateCreate(data: any): any {
    if (this.createSchema) {
      return this.createSchema.parse(data);
    }
    return data;
  }

  validateUpdate(data: any): any {
    if (this.updateSchema) {
      return this.updateSchema.parse(data);
    }
    return data;
  }

  validateFind(filter: any): any {
    if (this.findSchema) {
      return findParse(filter, this.findSchema);
    }
    return filter;
  }

  async get(id: string | ObjectId, findOptions?: FindOptions): Promise<WithId<any> | null> {
    return this.findOne({ _id: this.toObjectId(id) }, findOptions);
  }

  async find(filter: any, findOptions?: FindOptions): Promise<FindCursor<any>> {
    const validated = this.validateFind(filter);
    const finalFilter = { ...validated, deletedAt: null };
    return this.collection.find(finalFilter, findOptions);
  }

  async findOne(filter: any, findOptions?: FindOptions): Promise<any | null> {
    const validated = this.validateFind(filter);
    const finalFilter = { ...validated, deletedAt: null };
    return this.collection.findOne(finalFilter, findOptions);
  }

  async findAll(filter: any = {}, findOptions?: FindOptions): Promise<any[]> {
    const cursor = await this.find(filter, findOptions);
    return cursor.toArray();
  }

  async count(filter: any): Promise<number> {
    const validated = this.validateFind(filter);
    const finalFilter = { ...validated, deletedAt: null };
    return this.collection.countDocuments(finalFilter);
  }

  async create(data: any): Promise<WithId<any>> {
    const validData = this.validateCreate(data);
    const now = new Date();
    const doc = {
      ...validData,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as OptionalUnlessRequiredId<any>;

    const result = await this.collection.insertOne(doc);
    const insertedDoc = await this.collection.findOne({ _id: result.insertedId } as Filter<any>);
    if (!insertedDoc) {
      throw new Error('Failed to retrieve inserted document');
    }
    return insertedDoc;
  }

  async update(id: string | ObjectId, data: any): Promise<{ matchedCount: number; modifiedCount: number }> {
    const validData = this.validateUpdate(data);
    const result = await this.collection.updateOne(
      { _id: this.toObjectId(id), deletedAt: null } as Filter<any>,
      {
        $set: {
          ...validData,
          updatedAt: new Date(),
        },
      } as UpdateFilter<any>
    );
    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
  }

  async delete(id: string | ObjectId): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await this.collection.updateOne(
      { _id: this.toObjectId(id), deletedAt: null } as Filter<any>,
      {
        $set: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      } as UpdateFilter<any>
    );
    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
  }
}
