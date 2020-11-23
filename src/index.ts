import { QueryBuilder } from 'knex';
import { camelCase, snakeCase, mapKeys, first, pick } from 'lodash';

export default class ModelBase<T> {
  constructor(
    private db: (table: string) => QueryBuilder,
    private table: string,
    private upsertConflictKeys: string[],
  ) {}

  camelKeys(entity: Partial<T>) {
    return mapKeys(entity, (_, k) => camelCase(k));
  }

  snakeKeys(entity: Partial<T>) {
    return mapKeys(entity, (_, k) => snakeCase(k));
  }

  async fetchAll(where: Partial<T>): Promise<T[]> {
    const records = await this.db(this.table).where(this.snakeKeys(where));
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
    return this.db(this.table).where(where);
  }

  async upsert(entity: Partial<T>) : Promise<T>{
    const where: Partial<T> = pick(entity, this.upsertConflictKeys);
    const found = await this.fetchOne(where);
    if (found) return this.update(where, entity);
    return this.create(entity);
  }
}
