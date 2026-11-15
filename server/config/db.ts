import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

dotenv.config();

export interface DbRunResult {
  insertId: number;
  affectedRows: number;
}

export interface DbExecutor {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<DbRunResult>;
}

const DB_ENGINE = (process.env.DB_ENGINE || 'sqlite').toLowerCase();

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: Database.Database | null = null;
let activeEngine: 'mysql' | 'sqlite' = 'sqlite';
let connectionStatus = {
  connected: false,
  engine: 'sqlite' as 'mysql' | 'sqlite',
  database: process.env.DB_NAME || 'batloung_farm_db',
  error: null as string | null,
};

function getSqlitePath(): string {
  const configured = process.env.SQLITE_PATH || './server/database/batloung_farm.db';
  const resolved = path.resolve(process.cwd(), configured);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return resolved;
}

export async function initializeConnection(): Promise<void> {
  if (DB_ENGINE === 'mysql') {
    try {
      mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'batloung_farm_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        decimalNumbers: true,
      });

      const conn = await mysqlPool.getConnection();
      await conn.ping();
      conn.release();

      activeEngine = 'mysql';
      connectionStatus = {
        connected: true,
        engine: 'mysql',
        database: process.env.DB_NAME || 'batloung_farm_db',
        error: null,
      };
      console.log('[DB] Connected to MySQL database via mysql2');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown MySQL connection error';
      connectionStatus = {
        connected: false,
        engine: 'mysql',
        database: process.env.DB_NAME || 'batloung_farm_db',
        error: message,
      };
      console.error(`[DB] MySQL connection failed: ${message}`);
      console.error('[DB] Application remains online; check .env DB credentials.');
      return;
    }
  }

  try {
    const dbPath = getSqlitePath();
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
    activeEngine = 'sqlite';
    connectionStatus = {
      connected: true,
      engine: 'sqlite',
      database: path.basename(dbPath),
      error: null,
    };
    console.log(`[DB] Connected to embedded database (${path.basename(dbPath)})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    connectionStatus = {
      connected: false,
      engine: 'sqlite',
      database: 'batloung_farm_db',
      error: message,
    };
    console.error(`[DB] Database initialization failed: ${message}`);
  }
}

export function getActiveEngine(): 'mysql' | 'sqlite' {
  return activeEngine;
}

export function getConnectionStatus() {
  return { ...connectionStatus };
}

export function getSqliteInstance(): Database.Database | null {
  return sqliteDb;
}

function assertConnected(): void {
  if (!connectionStatus.connected) {
    throw new Error(
      connectionStatus.error ||
        'Database connection is unavailable. Please verify database configuration in .env.'
    );
  }
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  assertConnected();
  if (activeEngine === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params as never[]);
    return rows as T[];
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params) as T[];
  }
  throw new Error('No database driver initialized.');
}

export async function execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
  assertConnected();
  if (activeEngine === 'mysql' && mysqlPool) {
    const [result] = await mysqlPool.execute(sql, params as never[]);
    const header = result as mysql.ResultSetHeader;
    return {
      insertId: Number(header.insertId || 0),
      affectedRows: Number(header.affectedRows || 0),
    };
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return {
      insertId: Number(info.lastInsertRowid || 0),
      affectedRows: Number(info.changes || 0),
    };
  }
  throw new Error('No database driver initialized.');
}

/**
 * Executes a callback inside an explicit atomic database transaction
 * using BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  assertConnected();

  if (activeEngine === 'mysql' && mysqlPool) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.query('BEGIN');
      const executor: DbExecutor = {
        async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
          const [rows] = await conn.query(sql, params as never[]);
          return rows as R[];
        },
        async execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
          const [result] = await conn.execute(sql, params as never[]);
          const header = result as mysql.ResultSetHeader;
          return {
            insertId: Number(header.insertId || 0),
            affectedRows: Number(header.affectedRows || 0),
          };
        },
      };
      const result = await fn(executor);
      await conn.query('COMMIT');
      return result;
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }

  if (sqliteDb) {
    sqliteDb.exec('BEGIN IMMEDIATE');
    try {
      const executor: DbExecutor = {
        async query<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
          const stmt = sqliteDb!.prepare(sql);
          return stmt.all(...params) as R[];
        },
        async execute(sql: string, params: unknown[] = []): Promise<DbRunResult> {
          const stmt = sqliteDb!.prepare(sql);
          const info = stmt.run(...params);
          return {
            insertId: Number(info.lastInsertRowid || 0),
            affectedRows: Number(info.changes || 0),
          };
        },
      };
      const result = await fn(executor);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        sqliteDb.exec('ROLLBACK');
      } catch {
        // Ignore rollback error if transaction already closed
      }
      throw err;
    }
  }

  throw new Error('No database driver initialized.');
}
