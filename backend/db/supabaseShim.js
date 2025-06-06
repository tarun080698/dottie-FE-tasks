/**
 * Database shim for Supabase
 * This file provides a Knex-like interface to Supabase for backward compatibility
 */

import supabase from '../services/supabaseService.js';

// Create a wrapper that simulates the Knex query builder
const createQueryBuilder = (tableName) => {
  const queryBuilder = {
    // State
    _table: tableName,
    _wheres: [],
    _orders: [],
    _limit: null,
    _offset: null,
    _inserts: null,
    _updates: null,
    
    // Methods
    where(field, value) {
      this._wheres.push({ field, value });
      return this;
    },
    
    orderBy(field, direction = 'asc') {
      this._orders.push({ field, direction });
      return this;
    },
    
    limit(limit) {
      this._limit = limit;
      return this;
    },
    
    offset(offset) {
      this._offset = offset;
      return this;
    },
    
    insert(data) {
      this._inserts = data;
      return this._runInsert();
    },
    
    update(data) {
      this._updates = data;
      return this._runUpdate();
    },
    
    delete() {
      return this._runDelete();
    },
    
    select(columns) {
      return this._runSelect(columns);
    },
    
    first() {
      this._limit = 1;
      return this._runSelect().then(data => data[0] || null);
    },
    
    // Execution methods
    async _runSelect(columns = '*') {
      let query = supabase.from(this._table).select(columns);
      
      // Apply wheres
      for (const where of this._wheres) {
        query = query.eq(where.field, where.value);
      }
      
      // Apply ordering
      if (this._orders.length > 0) {
        const { field, direction } = this._orders[0];
        query = query.order(field, { ascending: direction === 'asc' });
      }
      
      // Apply limit and offset
      if (this._limit !== null) {
        query = query.limit(this._limit);
      }
      
      if (this._offset !== null) {
        query = query.range(this._offset, this._offset + (this._limit || 1000) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    
    async _runInsert() {
      const { data, error } = await supabase
        .from(this._table)
        .insert(this._inserts)
        .select();
      
      if (error) throw error;
      return data?.map(item => item.id) || [];
    },
    
    async _runUpdate() {
      let query = supabase.from(this._table).update(this._updates);
      
      // Apply wheres
      for (const where of this._wheres) {
        query = query.eq(where.field, where.value);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data ? 1 : 0; // Return count affected (simplified)
    },
    
    async _runDelete() {
      let query = supabase.from(this._table).delete();
      
      // Apply wheres
      for (const where of this._wheres) {
        query = query.eq(where.field, where.value);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      return 1; // Return count affected (simplified)
    }
  };
  
  // Make it thenable for direct execution
  queryBuilder.then = (resolve, reject) => {
    return queryBuilder._runSelect()
      .then(resolve)
      .catch(reject);
  };
  
  return queryBuilder;
};

// Create a function that acts like the knex instance
const db = (tableName) => {
  return createQueryBuilder(tableName);
};

// Add raw query method
db.raw = async (sql) => {
  // For simple queries, try to interpret them
  if (sql === 'SELECT 1') {
    return [{ '1': 1 }];
  }
  
  // For other queries, console log them for now
  console.log(`[SUPABASE SHIM] Raw SQL not directly supported: ${sql}`);
  return [{ message: 'Raw SQL queries are not directly supported with Supabase' }];
};

// Add schema operations
db.schema = {
  hasTable: async (tableName) => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  },
  
  createTable: async (tableName, tableBuilder) => {
    console.log(`[SUPABASE SHIM] Creating tables not supported: ${tableName}`);
    return true;
  },
  
  dropTable: async (tableName) => {
    console.log(`[SUPABASE SHIM] Dropping tables not supported: ${tableName}`);
    return true;
  }
};

// Add client info for compatibility
db.client = {
  config: {
    client: 'supabase'
  }
};

// Database cleanup
db.destroy = async () => {
  console.log('[SUPABASE SHIM] Connection closed');
  return true;
};

// Add events
db.on = (event, callback) => {
  if (event === 'error') {
    // We could add real error handling here
    console.log('[SUPABASE SHIM] Registered error handler');
  }
  return db;
};

export { db };
export default db; 