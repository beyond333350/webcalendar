import { CalendarEvent, UserSettings, UserAuth } from './types';

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
  async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_BASE}/events`, {
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
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('更新设置失败');
    return res.json();
  },

  async testCalDAV(url: string, username?: string, password?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/settings/caldav-test`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, username, password })
    });
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
