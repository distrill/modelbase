# modelbase
Typed base model for use with the incredible knex query builder: https://knexjs.org/

* transform object keys to snake case for storage, and camelcase on the way out 
* typed queries and operations if you're into that  

### usage
``` typescript
// store_model.ts
import BaseModel from 'bh-modelbase';
import initDB from '../../lib/db';

type Store = {
  id: string,
  userId: string,
  name: string,
};

export default class StoreModel extends BaseModel<Store> {
  constructor(db) {
    const table = 'store';
    super(db, table);
  }
}

async function run() {
  const db = await initDB();
  const storeModel = new StoreModel(db);
  
  let stores = await storeModel.fetchAll();
  // []
  
  const store = await storeModel.create({
    id: '123',
    userId: '234',
    name: 'this is a store',
  });
  // { id: '123', userId: '234', name: 'this is a store' }
  
  const newStores = await storeModel.fetchAll();
  // [ { id: '123', userId: '234', name: 'this is a store' } ]
  await db.destroy();
}

run().catch(err => console.log(err));
```

