export type ItemType = 'event' | 'todo';

export interface CalDAVSource {
  id: string;
  user_id?: number;
  name: string;
  type: ItemType;
  url: string;
  username?: string;
  password?: string;
  color: string;
  is_default: number | boolean;
  enabled: number | boolean;
  created_at?: string;
}

export interface CalendarEvent {
  id: string;
  user_id?: number;
  source_id?: string;
  title: string;
  description?: string;
  type: ItemType;
  start_date: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string;   // HH:mm
  is_completed?: number | boolean;
  color?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id: number;
  location_code: string;
  weather_provider: string;
  caldav_url: string;
  caldav_todo_url?: string;
  caldav_user: string;
  caldav_password?: string;
  calendar_color: string;
  todo_color: string;
}

export interface UserAuth {
  token: string;
  username: string;
  userId: number;
}

export interface WeatherInfo {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  temp: string;
}
