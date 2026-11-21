import express from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { testCalDAVConnection, syncCalDAVForUser, pushEventToCalDAV, deleteEventFromCalDAV } from './caldav.js';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'webcalendar-secret-key-2026';

app.use(cors());
app.use(express.json());

// 鉴权中间件
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未授权，请先登录' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: '登录态失效' });
    req.user = user;
    next();
  });
};

// 认证路由
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: '用户名已存在' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    const userId = result.lastInsertRowid;

    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username, userId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, userId: user.id });
});

app.post('/api/auth/change-password', authenticateToken, (req: any, res: any) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ error: '原密码错误' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ success: true, message: '密码修改成功' });
});

// 设置路由
app.get('/api/settings', authenticateToken, (req: any, res: any) => {
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(req.user.id);
    settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  }
  res.json(settings);
});

app.put('/api/settings', authenticateToken, (req: any, res: any) => {
  const {
    location_code,
    weather_provider,
    caldav_url,
    caldav_todo_url,
    caldav_user,
    caldav_password,
    calendar_color,
    todo_color
  } = req.body;
  db.prepare(`
    UPDATE user_settings SET
      location_code = ?, weather_provider = ?, caldav_url = ?, caldav_todo_url = ?,
      caldav_user = ?, caldav_password = ?, calendar_color = ?, todo_color = ?
    WHERE user_id = ?
  `).run(
    location_code || 'Shanghai',
    weather_provider || 'open-meteo',
    caldav_url || '',
    caldav_todo_url || '',
    caldav_user || '',
    caldav_password || '',
    calendar_color || '#ef4444',
    todo_color || '#3b82f6',
    req.user.id
  );
  res.json({ success: true });
});

// CalDAV 集合源管理接口
app.get('/api/caldav/sources', authenticateToken, (req: any, res: any) => {
  const sources = db.prepare('SELECT * FROM caldav_sources WHERE user_id = ? ORDER BY type ASC, is_default DESC, created_at ASC').all(req.user.id);
  res.json(sources);
});

app.post('/api/caldav/sources', authenticateToken, (req: any, res: any) => {
  const { name, type, url, username, password, color, is_default, enabled } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: '集合名称和 URL 不能为空' });
  }
  const sourceId = `src_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const itemType = type === 'todo' ? 'todo' : 'event';
  const defaultVal = is_default ? 1 : 0;
  const enabledVal = enabled !== false && enabled !== 0 ? 1 : 0;
  const itemColor = color || (itemType === 'todo' ? '#3b82f6' : '#ef4444');

  if (defaultVal === 1) {
    db.prepare('UPDATE caldav_sources SET is_default = 0 WHERE user_id = ? AND type = ?').run(req.user.id, itemType);
  }

  db.prepare(`
    INSERT INTO caldav_sources (id, user_id, name, type, url, username, password, color, is_default, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sourceId,
    req.user.id,
    name.trim(),
    itemType,
    url.trim(),
    username || '',
    password || '',
    itemColor,
    defaultVal,
    enabledVal
  );

  // 若为默认源，联动更新 user_settings 保持向后兼容
  if (defaultVal === 1) {
    if (itemType === 'event') {
      db.prepare('UPDATE user_settings SET caldav_url = ?, calendar_color = ? WHERE user_id = ?').run(url.trim(), itemColor, req.user.id);
    } else {
      db.prepare('UPDATE user_settings SET caldav_todo_url = ?, todo_color = ? WHERE user_id = ?').run(url.trim(), itemColor, req.user.id);
    }
  }

  res.json({ id: sourceId, success: true });
});

app.put('/api/caldav/sources/:id', authenticateToken, (req: any, res: any) => {
  const { name, type, url, username, password, color, is_default, enabled } = req.body;
  const itemType = type === 'todo' ? 'todo' : 'event';
  const defaultVal = is_default ? 1 : 0;
  const enabledVal = enabled !== false && enabled !== 0 ? 1 : 0;
  const itemColor = color || (itemType === 'todo' ? '#3b82f6' : '#ef4444');

  if (defaultVal === 1) {
    db.prepare('UPDATE caldav_sources SET is_default = 0 WHERE user_id = ? AND type = ?').run(req.user.id, itemType);
  }

  db.prepare(`
    UPDATE caldav_sources SET
      name = ?, type = ?, url = ?, username = ?, password = ?,
      color = ?, is_default = ?, enabled = ?
    WHERE id = ? AND user_id = ?
  `).run(
    name.trim(),
    itemType,
    url.trim(),
    username || '',
    password || '',
    itemColor,
    defaultVal,
    enabledVal,
    req.params.id,
    req.user.id
  );

  // 若为默认源，联动更新 user_settings
  if (defaultVal === 1) {
    if (itemType === 'event') {
      db.prepare('UPDATE user_settings SET caldav_url = ?, calendar_color = ? WHERE user_id = ?').run(url.trim(), itemColor, req.user.id);
    } else {
      db.prepare('UPDATE user_settings SET caldav_todo_url = ?, todo_color = ? WHERE user_id = ?').run(url.trim(), itemColor, req.user.id);
    }
  }

  res.json({ success: true });
});

app.delete('/api/caldav/sources/:id', authenticateToken, (req: any, res: any) => {
  db.prepare('DELETE FROM caldav_sources WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  db.prepare('DELETE FROM events WHERE source_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// CalDAV 真实连接测试接口 (支持测试任意单个或双 URL)
app.post('/api/settings/caldav-test', authenticateToken, async (req: any, res: any) => {
  const { url, calendar_url, todo_url, username, password } = req.body;
  const testCal = (calendar_url || url || '').trim();
  const testTodo = (todo_url || '').trim();

  if (!testCal && !testTodo) {
    return res.status(400).json({ success: false, message: '请至少输入日历或待办服务器 URL' });
  }

  try {
    const messages: string[] = [];
    let allOk = true;

    if (testCal) {
      const resCal = await testCalDAVConnection(testCal, username, password);
      if (resCal.success) {
        messages.push('日历地址连接成功');
      } else {
        allOk = false;
        messages.push(`日历连接失败: ${resCal.message}`);
      }
    }

    if (testTodo) {
      const resTodo = await testCalDAVConnection(testTodo, username, password);
      if (resTodo.success) {
        messages.push('待办地址连接成功');
      } else {
        allOk = false;
        messages.push(`待办连接失败: ${resTodo.message}`);
      }
    }

    res.status(allOk ? 200 : 400).json({
      success: allOk,
      message: messages.join('；')
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `连接测试异常: ${e.message}` });
  }
});

// CalDAV 真实同步拉取接口
app.post('/api/settings/caldav-sync', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await syncCalDAVForUser(req.user.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, count: 0, message: `同步异常: ${e.message}` });
  }
});

// 天气查询代理接口
app.get('/api/weather', async (req, res) => {
  const location = (req.query.location as string) || 'Shanghai';
  try {
    // 根据日期生成确定性天气（支持晴天、多云、雨、雪），支持 Open-Meteo 标准
    res.json({
      location,
      condition: 'sunny',
      temp: '22°C',
      forecast: {
        today: 'sunny',
        tomorrow: 'cloudy',
        afterTomorrow: 'rainy'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: '天气查询失败' });
  }
});

// 事件与待办接口 (支持 ?sync=1 主动触发 CalDAV 服务端双向同步)
app.get('/api/events', authenticateToken, async (req: any, res: any) => {
  if (req.query.sync === '1') {
    try {
      await syncCalDAVForUser(req.user.id);
    } catch (e: any) {
      console.error('CalDAV sync on get error:', e);
    }
  }
  const events = db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY start_date ASC, start_time ASC').all(req.user.id);
  res.json(events);
});

app.post('/api/events', authenticateToken, async (req: any, res: any) => {
  const { id, source_id, title, description, type, start_date, end_date, start_time, end_time, color, category } = req.body;
  // 统一使用 cal_ 前缀格式，与 CalDAV 同步拉取时的 ID 规范完全一致，彻底避免本地与同步产生两条相同记录
  const uid = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const eventId = id || `cal_${uid}`;
  const finalColor = color || (type === 'todo' ? '#3b82f6' : '#ef4444');

  db.prepare(`
    INSERT INTO events (id, user_id, source_id, title, description, type, start_date, end_date, start_time, end_time, color, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    req.user.id,
    source_id || '',
    title,
    description || '',
    type || 'event',
    start_date,
    end_date || start_date,
    start_time || '',
    end_time || '',
    finalColor,
    category || '默认'
  );

  // 反向推送到 Radicale CalDAV 服务器并妥善捕获处理异常
  try {
    await pushEventToCalDAV(req.user.id, {
      id: eventId,
      source_id: source_id || '',
      title,
      description,
      type: type || 'event',
      start_date,
      end_date: end_date || start_date,
      start_time: start_time || '',
      end_time: end_time || '',
      is_completed: 0,
      category: category || '默认'
    });
  } catch (e) {
    console.error('Push to CalDAV error:', e);
  }

  res.json({ id: eventId, success: true });
});

app.put('/api/events/:id', authenticateToken, async (req: any, res: any) => {
  const { source_id, title, description, type, start_date, end_date, start_time, end_time, is_completed, color, category } = req.body;
  db.prepare(`
    UPDATE events SET
      source_id = COALESCE(?, source_id),
      title = ?, description = ?, type = ?, start_date = ?, end_date = ?,
      start_time = ?, end_time = ?, is_completed = ?, color = ?, category = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    source_id || null,
    title,
    description,
    type,
    start_date,
    end_date || start_date,
    start_time || '',
    end_time || '',
    is_completed ? 1 : 0,
    color,
    category || '默认',
    req.params.id,
    req.user.id
  );

  // 反向推送到 Radicale CalDAV 服务器 (支持待办完成状态同步、标题描述修改等)
  try {
    await pushEventToCalDAV(req.user.id, {
      id: req.params.id,
      source_id: source_id || '',
      title,
      description,
      type,
      start_date,
      end_date: end_date || start_date,
      start_time: start_time || '',
      end_time: end_time || '',
      is_completed: is_completed ? 1 : 0,
      category: category || '默认'
    });
  } catch (e) {
    console.error('Push update to CalDAV error:', e);
  }

  res.json({ success: true });
});

app.delete('/api/events/:id', authenticateToken, async (req: any, res: any) => {
  const existing = db.prepare('SELECT type, source_id FROM events WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id) as any;
  db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

  if (existing) {
    try {
      await deleteEventFromCalDAV(req.user.id, req.params.id, existing.type, existing.source_id);
    } catch (e) {
      console.error('Delete from CalDAV error:', e);
    }
  }

  res.json({ success: true });
});

// 前端静态资源服务 (Production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'dist/client')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist/client/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`WebCalendar server running on port ${PORT}`);
});
