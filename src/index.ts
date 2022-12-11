import {Knex} from 'knex';
import { camelCase, snakeCase, first, pick } from 'lodash';

export type TBaseModelConfig = {
  trx?: Knex,
};

export default class ModelBase<T> {
  constructor(
    protected db: Knex,
    protected table: string,
    protected upsertConflictKeys?: string[],
  ) {}

  camelKeys(entity: any): T {
    return Object.keys(entity).reduce((accum, key) => {
      return { ...accum, [camelCase(key)]: entity[key] };
    }, {} as T);
  }

  snakeKeys(entity: any): T {
    return Object.keys(entity).reduce((accum, key) => {
      return { ...accum, [snakeCase(key)]: entity[key] };
    }, {} as T);
  }

  async fetchAll(
    where?: Partial<T>,
    config?: TBaseModelConfig & {
      order?: {
        [key: string]: 'asc' | 'desc',
      },
    },
  ): Promise<T[]> {
    const trx = config?.trx ?? this.db;
    let query = trx(this.table);
    if (where != null) {
      query = query.where(this.snakeKeys(where) as Partial<T>);
    }
    if (config?.order != null) {
      const orderBy = Object.keys(config.order).map((column) => ({
        column,
        order: config?.order?.[column],
      }));
      query = query.orderBy(orderBy);
    }
    return (await query).map(this.camelKeys);
  }

  async fetchOne(where: Partial<T>, config?: TBaseModelConfig): Promise<T | undefined> {
    // do we care about too many records?
    // this blindly returns the first one
    return this.fetchAll(where, config).then(first);
  }

  async create(entity: Partial<T>, config?: TBaseModelConfig): Promise<T> {
    const trx = config?.trx ?? this.db;
    await trx(this.table).insert(this.snakeKeys(entity));
    return entity as T;
  }

  async update(
    where: Partial<T> | null,
    what: Partial<T>,
    config?: TBaseModelConfig,
  ): Promise<Array<T>> {
    const trx = config?.trx ?? this.db;
    let query = trx(this.table)
      .update(this.snakeKeys(what))
      .returning('*');
    if (where != null) {
      query = query.where(this.snakeKeys(where) as Partial<T>) ;
    }
    return query.then(updated => updated.map(this.camelKeys));
  }

  async updateOne(
    where: Partial<T>,
    what: Partial<T>,
    config?: TBaseModelConfig,
  ): Promise<T> {
    const updated = await this.update(where, what, config);
    if (updated.length !== 1) {
      throw new Error(`expected single entity, got ${updated}`)
    }
    return updated[0];
  }

  async upsert(entity: Partial<T>, config?: TBaseModelConfig) : Promise<T> {
    if (!this.upsertConflictKeys) {
      throw new Error('upsert conflict keys must be specified to use upsert function');
    }
    const where: Partial<T> = pick(entity, this.upsertConflictKeys);
    const found = await this.fetchOne(where, config);
    if (found) return this.updateOne(where, entity, config);
    return this.create(entity, config);
  }

  async removeOne(where: Partial<T>, config?: TBaseModelConfig): Promise<T> {
    const trx = config?.trx ?? this.db;
    const toRemove = await this.fetchAll(where, config);
    if (toRemove.length !== 1) {
      throw new Error(`removeOne may only remove a single record. query returned ${toRemove.length}`);
    }
    await trx(this.table)
      .where(this.snakeKeys(where) as Partial<T>)
      .del()
    return toRemove[0];
  }

  async removeAll(where: Partial<T>, config?: TBaseModelConfig): Promise<T[]> {
    const trx = config?.trx ?? this.db;
    const toRemove = await this.fetchAll(where, config);     
    await trx(this.table)
      .where(this.snakeKeys(where) as Partial<T>)
      .del()
    return toRemove;
  }
}


