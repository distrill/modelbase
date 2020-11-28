import { QueryBuilder } from 'knex';
import { camelCase, snakeCase, mapKeys, first, pick } from 'lodash';

export type Connection = (_t: string) => QueryBuilder;

export default class ModelBase<T> {
  constructor(
    protected db: Connection,
    protected table: string,
    protected upsertConflictKeys?: string[],
  ) {}

  camelKeys(entity: Partial<T>) {
    return mapKeys(entity, (_, k) => camelCase(k));
  }

  snakeKeys(entity: Partial<T>) {
    return mapKeys(entity, (_, k) => snakeCase(k));
  }

  async fetchAll(where?: Partial<T>): Promise<T[]> {
    let query = this.db(this.table);
    if (where) {
      query = query.where(this.snakeKeys(where));
    }
    const records = await query;
    return records.map(this.camelKeys);
  }

  async fetchOne(where: Partial<T>): Promise<T | undefined> {
    // do we care about too many records?
    // this blindly returns the first one
    return this.fetchAll(where).then(first);
  }

  async create(entity: Partial<T>): Promise<T> {
    await this.db(this.table).insert(this.snakeKeys(entity));
    return entity as T;
  }

  async update(where: Partial<T>, what: Partial<T>): Promise<T> {
    await this.db(this.table)
      .update(this.snakeKeys(what))
      .where(this.snakeKeys(where));
    const updated = await this.fetchOne(where);
    if (!updated) {
      throw new Error('Entity cannot be null');
    }
    return updated;
  }

  async upsert(entity: Partial<T>) : Promise<T> {
    if (!this.upsertConflictKeys) {
      throw new Error('upsert conflict keys must be specified to use upsert function');
    }
    const where: Partial<T> = pick(entity, this.upsertConflictKeys);
    const found = await this.fetchOne(where);
    if (found) return this.update(where, entity);
    return this.create(entity);
  }

  async removeOne(where: Partial<T>): Promise<T> {
    const toRemove = await this.fetchAll(where);     
    if (toRemove.length !== 1) {
      throw new Error(`removeOne may only remove a single record. query returned ${toRemove.length}`);
    }
    await this.db(this.table)
      .where(this.snakeKeys(where))
      .del()
    return toRemove[0];
  }

  async removeAll(where: Partial<T>): Promise<T[]> {
    const toRemove = await this.fetchAll(where);     
    await this.db(this.table)
      .where(this.snakeKeys(where))
      .del()
    return toRemove;
  }
}


