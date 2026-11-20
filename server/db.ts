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

// 平滑迁移旧数据库表字段与纠正历史默认颜色
try {
  const columns = db.prepare("PRAGMA table_info(user_settings)").all() as any[];
  const hasTodoUrl = columns.some((c: any) => c.name === 'caldav_todo_url');
  if (!hasTodoUrl) {
    db.exec("ALTER TABLE user_settings ADD COLUMN caldav_todo_url TEXT DEFAULT ''");
  }

  // 修正历史默认颜色：日历为红色 #ef4444，待办为蓝色 #3b82f6
  db.exec(`
    UPDATE user_settings
    SET calendar_color = '#ef4444'
    WHERE calendar_color = '#3b82f6' OR calendar_color = '#f43f5e';

    UPDATE user_settings
    SET todo_color = '#3b82f6'
    WHERE todo_color = '#f43f5e' OR todo_color = '#ef4444';

    -- 若用户配置了 beyond333350 的工作日历但待办 URL 尚为空，自动补全其日常待办集合 URL
    UPDATE user_settings
    SET caldav_todo_url = 'https://rili.359261634.xyz/beyond333350/9209924e-72f6-c884-6e97-e546a6f9022a/'
    WHERE (caldav_url LIKE '%beyond333350%' OR caldav_user = 'beyond333350')
      AND (caldav_todo_url IS NULL OR caldav_todo_url = '');

    UPDATE events
    SET color = '#ef4444'
    WHERE type = 'event' AND (color = '#3b82f6' OR color = '#f43f5e');

    UPDATE events
    SET color = '#3b82f6'
    WHERE type = 'todo' AND (color = '#f43f5e' OR color = '#ef4444');
  `);
} catch (e) {
  // 忽略已存在或初次创建错误
}
