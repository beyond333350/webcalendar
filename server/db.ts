import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

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
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
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
    source_id TEXT DEFAULT '',
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

  CREATE TABLE IF NOT EXISTS caldav_sources (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('event', 'todo')),
    url TEXT NOT NULL,
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    color TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// 平滑迁移旧数据库表字段与纠正历史默认颜色
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasIsAdmin = userCols.some((c: any) => c.name === 'is_admin');
  if (!hasIsAdmin) {
    db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0");
  }

  // 初始化系统设置默认值（默认开启新用户注册）
  db.exec(`
    INSERT OR IGNORE INTO system_settings (key, value) VALUES ('allow_registration', '1');
  `);

  const settingsCols = db.prepare("PRAGMA table_info(user_settings)").all() as any[];
  const hasTodoUrl = settingsCols.some((c: any) => c.name === 'caldav_todo_url');
  if (!hasTodoUrl) {
    db.exec("ALTER TABLE user_settings ADD COLUMN caldav_todo_url TEXT DEFAULT ''");
  }

  const eventsCols = db.prepare("PRAGMA table_info(events)").all() as any[];
  const hasSourceId = eventsCols.some((c: any) => c.name === 'source_id');
  if (!hasSourceId) {
    db.exec("ALTER TABLE events ADD COLUMN source_id TEXT DEFAULT ''");
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

    -- 清理历史因主键前缀不一致产生的重复项：如果同一用户下存在对应 cal_ 记录，删除旧的 evt_ 孤儿记录
    DELETE FROM events
    WHERE (id LIKE 'evt_%' OR id LIKE 'local-%')
      AND EXISTS (
        SELECT 1 FROM events e2
        WHERE e2.user_id = events.user_id
          AND (e2.id = ('cal_' || events.id) OR (e2.title = events.title AND e2.start_date = events.start_date AND e2.type = events.type))
      );
  `);

  // 自动将旧版单 URL 设置无缝平滑迁移至多集合表 caldav_sources 中
  const settingsList = db.prepare("SELECT * FROM user_settings").all() as any[];
  for (const st of settingsList) {
    const existingCount = (db.prepare("SELECT count(*) as count FROM caldav_sources WHERE user_id = ?").get(st.user_id) as any)?.count || 0;
    if (existingCount === 0) {
      if (st.caldav_url && st.caldav_url.trim()) {
        db.prepare(`
          INSERT INTO caldav_sources (id, user_id, name, type, url, username, password, color, is_default, enabled)
          VALUES (?, ?, ?, 'event', ?, ?, ?, ?, 1, 1)
        `).run(
          `src_cal_${st.user_id}`,
          st.user_id,
          '工作日历',
          st.caldav_url.trim(),
          st.caldav_user || '',
          st.caldav_password || '',
          st.calendar_color || '#ef4444'
        );
      }
      if (st.caldav_todo_url && st.caldav_todo_url.trim()) {
        db.prepare(`
          INSERT INTO caldav_sources (id, user_id, name, type, url, username, password, color, is_default, enabled)
          VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, 1, 1)
        `).run(
          `src_todo_${st.user_id}`,
          st.user_id,
          '日常待办',
          st.caldav_todo_url.trim(),
          st.caldav_user || '',
          st.caldav_password || '',
          st.todo_color || '#3b82f6'
        );
      }
    }
  }

  // 初始化超级管理员账号（从环境变量读取，不硬编码）
  const adminUsername = process.env.ADMIN_USERNAME?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (adminUsername && adminPassword) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername) as any;
    if (!existing) {
      const hash = bcrypt.hashSync(adminPassword, 10);
      const res = db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)').run(adminUsername, hash);
      const userId = res.lastInsertRowid;
      db.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId);
      console.log(`[Init] 超级管理员 "${adminUsername}" 初始化成功`);
    } else {
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    }
  }
} catch (e) {
  // 忽略已存在或初次创建错误
}
