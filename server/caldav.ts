import { db } from './db.js';

export interface CalDAVSyncResult {
  success: boolean;
  count: number;
  message: string;
}

// 展开 iCalendar 折叠行 (RFC 5545)
function unfoldICal(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// 反转义 iCalendar 文本
function unescapeICalText(str: string): string {
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

// 解析 iCalendar 日期时间 (支持 YYYYMMDD, YYYYMMDDTHHmmss, YYYYMMDDTHHmmssZ)
function parseICalDateTime(raw: string): { date: string; time: string } {
  const clean = raw.trim();
  // 纯日期: 20261120
  if (/^\d{8}$/.test(clean)) {
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: '' };
  }

  // 日期时间: 20261120T143000 或 20261120T143000Z
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (match) {
    const [, y, m, d, hh, mm, ss, isUtc] = match;
    if (isUtc) {
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
      const pad = (n: number) => String(n).padStart(2, '0');
      const localDate = `${utcDate.getFullYear()}-${pad(utcDate.getMonth() + 1)}-${pad(utcDate.getDate())}`;
      const localTime = `${pad(utcDate.getHours())}:${pad(utcDate.getMinutes())}`;
      return { date: localDate, time: localTime };
    }
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  }

  // 兜底为今天
  return { date: new Date().toISOString().split('T')[0], time: '' };
}

// 清理 XML 实体和 CDATA
function cleanXmlCalendarData(raw: string): string {
  let cleaned = raw;
  if (cleaned.includes('<![CDATA[')) {
    cleaned = cleaned.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  }
  return cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export interface ParsedItem {
  uid: string;
  type: 'event' | 'todo';
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isCompleted: number;
  category: string;
}

// 解析 VCALENDAR 内容中的 VEVENT 和 VTODO
export function parseICS(icsText: string): ParsedItem[] {
  const unfolded = unfoldICal(icsText);
  const lines = unfolded.split(/\r?\n/);
  const items: ParsedItem[] = [];

  let inComponent = false;
  let compType: 'event' | 'todo' = 'event';

  let uid = '';
  let title = '';
  let description = '';
  let startDate = '';
  let endDate = '';
  let startTime = '';
  let endTime = '';
  let isCompleted = 0;
  let category = '默认';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === 'BEGIN:VEVENT') {
      inComponent = true;
      compType = 'event';
      uid = '';
      title = '';
      description = '';
      startDate = '';
      endDate = '';
      startTime = '';
      endTime = '';
      isCompleted = 0;
      category = '默认';
      continue;
    }

    if (trimmed === 'BEGIN:VTODO') {
      inComponent = true;
      compType = 'todo';
      uid = '';
      title = '';
      description = '';
      startDate = '';
      endDate = '';
      startTime = '';
      endTime = '';
      isCompleted = 0;
      category = '默认';
      continue;
    }

    if (trimmed === 'END:VEVENT' || trimmed === 'END:VTODO') {
      if (inComponent) {
        if (!uid) {
          uid = `cal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        }
        if (!startDate) {
          startDate = new Date().toISOString().split('T')[0];
        }
        if (!endDate) {
          endDate = startDate;
        }

        items.push({
          uid,
          type: compType,
          title: title || (compType === 'todo' ? '未命名待办' : '未命名日程'),
          description,
          startDate,
          endDate,
          startTime,
          endTime,
          isCompleted,
          category
        });
        inComponent = false;
      }
      continue;
    }

    if (!inComponent) continue;

    // 解析属性: KEY;PARAM=VAL:VALUE 或 KEY:VALUE
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const propHeader = trimmed.slice(0, colonIdx);
    const propValue = trimmed.slice(colonIdx + 1);
    const propName = propHeader.split(';')[0].toUpperCase();

    switch (propName) {
      case 'UID':
        uid = propValue.trim();
        break;
      case 'SUMMARY':
        title = unescapeICalText(propValue);
        break;
      case 'DESCRIPTION':
        description = unescapeICalText(propValue);
        break;
      case 'DTSTART': {
        const dt = parseICalDateTime(propValue);
        startDate = dt.date;
        startTime = dt.time;
        break;
      }
      case 'DTEND':
      case 'DUE': {
        const dt = parseICalDateTime(propValue);
        endDate = dt.date;
        endTime = dt.time;
        break;
      }
      case 'STATUS':
        if (propValue.toUpperCase().includes('COMPLETED')) {
          isCompleted = 1;
        }
        break;
      case 'PERCENT-COMPLETE':
        if (parseInt(propValue.trim(), 10) === 100) {
          isCompleted = 1;
        }
        break;
      case 'COMPLETED':
        isCompleted = 1;
        break;
      case 'CATEGORIES':
        category = unescapeICalText(propValue.split(',')[0]);
        break;
    }
  }

  return items;
}

// 测试 CalDAV 连接
export async function testCalDAVConnection(urlStr: string, username?: string, password?: string) {
  try {
    const url = new URL(urlStr);
    const headers: Record<string, string> = {
      'Depth': '0',
      'User-Agent': 'WebCalendar/1.0'
    };
    if (username && password) {
      const basic = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    // 优先尝试 PROPFIND
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'PROPFIND',
        headers
      });
    } catch {
      // 降级尝试 OPTIONS
      res = await fetch(url.toString(), {
        method: 'OPTIONS',
        headers
      });
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, status: res.status, message: `认证失败：用户名或密码错误 (HTTP ${res.status})` };
    }
    if (res.status === 404) {
      return { success: false, status: res.status, message: `CalDAV 地址未找到 (HTTP 404)，请检查日历集合路径` };
    }
    if (res.status >= 200 && res.status < 300) {
      return { success: true, status: res.status, message: `CalDAV 连接成功！已验证服务器身份 (HTTP ${res.status})` };
    }

    if (res.status === 405) {
      const getRes = await fetch(url.toString(), { method: 'GET', headers });
      if (getRes.status >= 200 && getRes.status < 300) {
        return { success: true, status: getRes.status, message: `CalDAV 连接成功 (HTTP ${getRes.status})` };
      }
    }

    return { success: false, status: res.status, message: `服务器返回状态: HTTP ${res.status} ${res.statusText}` };
  } catch (err: any) {
    return { success: false, message: `网络连接失败: ${err.message || '无法访问该地址'}` };
  }
}

// 从指定 CalDAV 集合或单个 ICS 文件拉取并解析事项
async function fetchItemsFromUrl(urlStr: string, headers: Record<string, string>): Promise<ParsedItem[]> {
  const items: ParsedItem[] = [];
  const cleanUrl = urlStr.trim();
  if (!cleanUrl) return items;

  // 情况 1: 如果 URL 直接以 .ics 结尾，直接 GET 单文件
  if (cleanUrl.toLowerCase().endsWith('.ics')) {
    try {
      const res = await fetch(cleanUrl, { headers });
      if (res.ok) {
        const icsText = await res.text();
        return parseICS(icsText);
      }
    } catch {
      return items;
    }
  }

  // 情况 2: 标准 CalDAV 集合 URL，发送 REPORT 请求
  const targetUrl = cleanUrl.endsWith('/') ? cleanUrl : `${cleanUrl}/`;
  const reportXml = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:prop>
        <d:getetag />
        <c:calendar-data />
    </d:prop>
    <c:filter>
        <c:comp-filter name="VCALENDAR" />
    </c:filter>
</c:calendar-query>`;

  let reportSuccess = false;
  try {
    const reportRes = await fetch(targetUrl, {
      method: 'REPORT',
      headers: {
        ...headers,
        'Depth': '1',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: reportXml
    });

    if (reportRes.status === 207 || reportRes.status === 200) {
      const xmlText = await reportRes.text();
      const calendarDataRegex = /<(?:[a-zA-Z0-9_-]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?calendar-data>/gi;
      let match: RegExpExecArray | null;
      let foundCount = 0;

      while ((match = calendarDataRegex.exec(xmlText)) !== null) {
        foundCount++;
        const cleanIcs = cleanXmlCalendarData(match[1]);
        const parsed = parseICS(cleanIcs);
        items.push(...parsed);
      }

      if (foundCount > 0) {
        reportSuccess = true;
      }
    }
  } catch {
    // 忽略异常继续降级
  }

  // 情况 3: REPORT 不可用或未匹配到数据，通过 PROPFIND Depth: 1 查找所有 .ics 资源
  if (!reportSuccess) {
    try {
      const propfindXml = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
    <d:prop>
        <d:resourcetype />
        <d:getcontenttype />
    </d:prop>
</d:propfind>`;

      const propRes = await fetch(targetUrl, {
        method: 'PROPFIND',
        headers: {
          ...headers,
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8'
        },
        body: propfindXml
      });

      if (propRes.status === 207 || propRes.status === 200) {
        const xml = await propRes.text();
        const hrefRegex = /<(?:[a-zA-Z0-9_-]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?href>/gi;
        const hrefs: string[] = [];
        let hMatch: RegExpExecArray | null;
        while ((hMatch = hrefRegex.exec(xml)) !== null) {
          const rawHref = hMatch[1].trim();
          if (rawHref.endsWith('.ics')) {
            hrefs.push(rawHref);
          }
        }

        for (const itemHref of hrefs) {
          try {
            const fullItemUrl = new URL(itemHref, targetUrl).toString();
            const getRes = await fetch(fullItemUrl, { headers });
            if (getRes.ok) {
              const icsText = await getRes.text();
              const parsed = parseICS(icsText);
              items.push(...parsed);
            }
          } catch {
            // 忽略单个文件获取失败
          }
        }
      }
    } catch {
      // 忽略 PROPFIND 异常
    }
  }

  return items;
}

// 执行 CalDAV 同步并入库 (支持同时同步独立日历 URL 与待办 URL)
export async function syncCalDAVForUser(userId: number): Promise<CalDAVSyncResult> {
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
  if (!settings || (!settings.caldav_url && !settings.caldav_todo_url)) {
    return { success: false, count: 0, message: '尚未配置 CalDAV 服务器 URL' };
  }

  const calUrl = (settings.caldav_url || '').trim();
  const todoUrl = (settings.caldav_todo_url || '').trim();
  const username = settings.caldav_user || '';
  const password = settings.caldav_password || '';
  const calendarColor = settings.calendar_color || '#3b82f6';
  const todoColor = settings.todo_color || '#f43f5e';

  const headers: Record<string, string> = {
    'User-Agent': 'WebCalendar/1.0'
  };
  if (username && password) {
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }

  const allParsedItems: ParsedItem[] = [];

  // 1. 同步日历集合
  if (calUrl) {
    const calItems = await fetchItemsFromUrl(calUrl, headers);
    // 如果同时配置了专门的待办 URL，则日历集合中过滤保留 event；若未配待办 URL 则保留全部
    if (todoUrl) {
      allParsedItems.push(...calItems.filter(i => i.type === 'event'));
    } else {
      allParsedItems.push(...calItems);
    }
  }

  // 2. 同步待办集合
  if (todoUrl) {
    const todoItems = await fetchItemsFromUrl(todoUrl, headers);
    // 从待办集合中拉取，若未标记为 todo 则强制标记为 todo
    for (const item of todoItems) {
      item.type = 'todo';
      allParsedItems.push(item);
    }
  }

  if (allParsedItems.length === 0) {
    return { success: true, count: 0, message: 'CalDAV 连接正常，日历与待办集合中暂无事项' };
  }

  const insertOrUpdate = db.prepare(`
    INSERT INTO events (
      id, user_id, title, description, type, start_date, end_date,
      start_time, end_time, is_completed, color, category, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    ) ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      type = excluded.type,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      is_completed = excluded.is_completed,
      color = excluded.color,
      category = excluded.category,
      updated_at = CURRENT_TIMESTAMP
  `);

  const runSyncTransaction = db.transaction((items: ParsedItem[]) => {
    let saved = 0;
    for (const item of items) {
      const dbId = `cal_${item.uid}`;
      const color = item.type === 'todo' ? todoColor : calendarColor;
      insertOrUpdate.run(
        dbId,
        userId,
        item.title,
        item.description,
        item.type,
        item.startDate,
        item.endDate,
        item.startTime,
        item.endTime,
        item.isCompleted,
        color,
        item.category
      );
      saved++;
    }
    return saved;
  });

  const count = runSyncTransaction(allParsedItems);

  return {
    success: true,
    count,
    message: `成功同步 ${count} 条 Radicale 日历与待办事项`
  };
}
