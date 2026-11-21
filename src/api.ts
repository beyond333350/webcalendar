import { CalendarEvent, UserSettings, UserAuth, CalDAVSource } from './types';

const API_BASE = '/api';

export const getToken = (): string | null => {
  return localStorage.getItem('webcalendar_token');
};

export const setToken = (token: string) => {
  localStorage.setItem('webcalendar_token', token);
};

export const clearToken = () => {
  localStorage.removeItem('webcalendar_token');
  localStorage.removeItem('webcalendar_username');
  localStorage.removeItem('webcalendar_userid');
};

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

async function parseResponseJson(res: Response, fallbackMessage: string): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 502 || res.status === 504 || text.includes('ECONNREFUSED') || text.includes('Proxy error') || text.includes('failed to fetch')) {
      return {
        success: false,
        message: `无法连接到后端服务 (HTTP ${res.status})，请确认已运行 npm run dev 且后端服务已在 3000 端口启动`
      };
    }
    return {
      success: false,
      message: `${fallbackMessage}: HTTP ${res.status} ${text.slice(0, 100)}`
    };
  }
}

export const api = {
  // 认证
  async register(username: string, password: string): Promise<UserAuth> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '注册失败');
    }
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem('webcalendar_username', data.username);
    localStorage.setItem('webcalendar_userid', String(data.userId));
    return data;
  },

  async login(username: string, password: string): Promise<UserAuth> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '登录失败');
    }
    const data = await res.json();
    setToken(data.token);
    localStorage.setItem('webcalendar_username', data.username);
    localStorage.setItem('webcalendar_userid', String(data.userId));
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '密码修改失败');
    }
    return res.json();
  },

  // 事件与待办
  async getEvents(sync?: boolean): Promise<CalendarEvent[]> {
    const url = sync ? `${API_BASE}/events?sync=1` : `${API_BASE}/events`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('获取事件失败');
    return res.json();
  },

  async createEvent(event: Partial<CalendarEvent>): Promise<{ id: string; success: boolean }> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error('创建事件失败');
    return res.json();
  },

  async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(event)
    });
    if (!res.ok) throw new Error('更新事件失败');
    return res.json();
  },

  async deleteEvent(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('删除事件失败');
    return res.json();
  },

  // 设置
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('获取设置失败');
    return res.json();
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const errData = await parseResponseJson(res, '更新设置失败');
        throw new Error(errData.message || '更新设置失败');
      }
      return await res.json();
    } catch (e: any) {
      throw new Error(e.message || '更新设置失败，请确认后端 3000 服务正常运行');
    }
  },

  async testCalDAV(
    options: { url?: string; calendar_url?: string; todo_url?: string; username?: string; password?: string } | string,
    username?: string,
    password?: string
  ): Promise<{ success: boolean; message: string }> {
    const payload = typeof options === 'string'
      ? { url: options, username, password }
      : options;

    try {
      const res = await fetch(`${API_BASE}/settings/caldav-test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return await parseResponseJson(res, '测试连接失败');
    } catch (e: any) {
      return {
        success: false,
        message: `请求失败: ${e.message || '网络连接错误，请确认后端服务已启动'}`
      };
    }
  },

  async syncCalDAV(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/settings/caldav-sync`, {
        method: 'POST',
        headers: getHeaders()
      });
      return await parseResponseJson(res, '同步请求失败');
    } catch (e: any) {
      return {
        success: false,
        count: 0,
        message: `同步失败: ${e.message || '网络连接异常，请确认后端服务已启动'}`
      };
    }
  },

  // CalDAV 集合源多列表管理
  async getCalDAVSources(): Promise<CalDAVSource[]> {
    const res = await fetch(`${API_BASE}/caldav/sources`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('获取 CalDAV 集合列表失败');
    return res.json();
  },

  async createCalDAVSource(source: Partial<CalDAVSource>): Promise<{ id: string; success: boolean }> {
    const res = await fetch(`${API_BASE}/caldav/sources`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(source)
    });
    if (!res.ok) {
      const data = await parseResponseJson(res, '添加集合失败');
      throw new Error(data.error || data.message || '添加集合失败');
    }
    return res.json();
  },

  async updateCalDAVSource(id: string, source: Partial<CalDAVSource>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/caldav/sources/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(source)
    });
    if (!res.ok) {
      const data = await parseResponseJson(res, '更新集合失败');
      throw new Error(data.error || data.message || '更新集合失败');
    }
    return res.json();
  },

  async deleteCalDAVSource(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/caldav/sources/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('删除集合失败');
    return res.json();
  },

  // 天气查询
  async getWeather(location: string = 'Shanghai'): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/weather?location=${encodeURIComponent(location)}`);
      if (!res.ok) throw new Error('天气查询失败');
      return res.json();
    } catch {
      return { condition: 'sunny', temp: '22°C' };
    }
  }
};
