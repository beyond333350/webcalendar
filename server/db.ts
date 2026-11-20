import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'calendar.db');
export const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    location_code TEXT DEFAULT 'Shanghai',
    weather_provider TEXT DEFAULT 'open-meteo',
    caldav_url TEXT DEFAULT '',
    caldav_todo_url TEXT DEFAULT '',
    caldav_user TEXT DEFAULT '',
    caldav_password TEXT DEFAULT '',
    calendar_color TEXT DEFAULT '#ef4444',
    todo_color TEXT DEFAULT '#3b82f6',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('event', 'todo')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    start_time TEXT,
    end_time TEXT,
    is_completed INTEGER DEFAULT 0,
    color TEXT DEFAULT '#ef4444',
    category TEXT DEFAULT '默认',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// 平滑迁移旧数据库表字段
try {
  const columns = db.prepare("PRAGMA table_info(user_settings)").all() as any[];
  const hasTodoUrl = columns.some((c: any) => c.name === 'caldav_todo_url');
  if (!hasTodoUrl) {
    db.exec("ALTER TABLE user_settings ADD COLUMN caldav_todo_url TEXT DEFAULT ''");
  }
} catch (e) {
  // 忽略已存在或初次创建错误
}
