const { camelCase, snakeCase, mapKeys, first, pick } = require('lodash');

class BaseModel {
  constructor({ db, table, upsertConflictKeys }) {
    this.db = db;
    this.table = table;
    this.upsertConflictKeys = upsertConflictKeys;
  }

  static camelKeys(entity) {
    return mapKeys(entity, (_, k) => camelCase(k));
  }

  static snakeKeys(entity) {
    return mapKeys(entity, (_, k) => snakeCase(k));
  }

  async fetchAll(where) {
    const records = this.db(this.table).where(BaseModel.snakeKeys(where));
    return records.map(BaseModel.camelKeys);
  }

  async fetchOne(where) {
    // do we care about too many records?
    // this blindly returns the first one
    return this.fetchAll(where).then(first);
  }

  async create(entity) {
    await this.db(this.table).insert(BaseModel.snakeKeys(entity));
    return entity;
  }

  async update(where, what) {
    return this.db(this.table)
      .where(BaseModel.snakeKeys(where))
      .update(BaseModel.snakeKeys(what));
  }

  async upsert(entity) {
    const where = pick(entity, this.upsertConflictKeys);
    const found = await this.fetchOne(where);
    if (found) return this.update(where, entity);
    return this.create(entity);
  }
}

module.exports = BaseModel;
