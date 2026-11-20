import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { api, clearToken } from '../api';
import { X, User, Cloud, RefreshCw, KeyRound, LogOut, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  onAuthSuccess: (username: string) => void;
  onLogout: () => void;
  onSyncSuccess?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  username,
  onAuthSuccess,
  onLogout,
  onSyncSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'caldav' | 'weather'>('profile');

  // 认证状态表单
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // 修改密码表单
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // CalDAV 与天气设置
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    location_code: 'Shanghai',
    weather_provider: 'open-meteo',
    caldav_url: '',
    caldav_user: '',
    caldav_password: '',
    calendar_color: '#3b82f6',
    todo_color: '#f43f5e'
  });
  const [caldavTestMsg, setCaldavTestMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [caldavSyncMsg, setCaldavSyncMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isTestingCaldav, setIsTestingCaldav] = useState(false);
  const [isSyncingCaldav, setIsSyncingCaldav] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && username) {
      api.getSettings().then(setSettings).catch(() => {});
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await api.login(authUsername, authPassword);
        onAuthSuccess(res.username);
      } else {
        const res = await api.register(authUsername, authPassword);
        onAuthSuccess(res.username);
      }
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || '操作失败');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      setPwdMsg({ text: res.message || '密码修改成功', type: 'success' });
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwdMsg({ text: err.message || '修改失败', type: 'error' });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // 如果填写了 CalDAV URL，保存后自动执行同步
      if (settings.caldav_url) {
        setIsSyncingCaldav(true);
        setCaldavSyncMsg(null);
        try {
          const syncRes = await api.syncCalDAV();
          setCaldavSyncMsg({
            text: syncRes.message || (syncRes.success ? `同步完成，共获取 ${syncRes.count} 项` : '同步失败'),
            type: syncRes.success ? 'success' : 'error'
          });
          if (syncRes.success && onSyncSuccess) {
            onSyncSuccess();
          }
        } catch (e: any) {
          setCaldavSyncMsg({ text: `自动同步异常: ${e.message}`, type: 'error' });
        } finally {
          setIsSyncingCaldav(false);
        }
      }
    } catch (err) {
      alert('保存设置失败');
    }
  };

  const handleTestCaldav = async () => {
    if (!settings.caldav_url) {
      setCaldavTestMsg({ text: '请先填写 CalDAV 服务器 URL', type: 'error' });
      return;
    }
    setIsTestingCaldav(true);
    setCaldavTestMsg(null);
    try {
      const res = await api.testCalDAV(settings.caldav_url, settings.caldav_user, settings.caldav_password);
      setCaldavTestMsg({ text: res.message, type: res.success ? 'success' : 'error' });
    } catch (err: any) {
      setCaldavTestMsg({ text: '连接测试失败', type: 'error' });
    } finally {
      setIsTestingCaldav(false);
    }
  };

  const handleSyncCaldav = async () => {
    if (!settings.caldav_url) {
      setCaldavSyncMsg({ text: '请先配置并保存 CalDAV 服务器 URL', type: 'error' });
      return;
    }
    setIsSyncingCaldav(true);
    setCaldavSyncMsg(null);
    try {
      // 先保存最新配置确保凭证一致
      await api.updateSettings(settings);
      const res = await api.syncCalDAV();
      setCaldavSyncMsg({ text: res.message, type: res.success ? 'success' : 'error' });
      if (res.success && onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (err: any) {
      setCaldavSyncMsg({ text: `同步失败: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncingCaldav(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e1e22] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* 对话框头部 */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-zinc-100">应用设置与账号</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/60 px-4 pt-2 space-x-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>用户账号</span>
          </button>
          <button
            onClick={() => setActiveTab('caldav')}
            className={`pb-2 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'caldav'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Radicale CalDAV 同步</span>
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`pb-2 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'weather'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>天气集成</span>
          </button>
        </div>

        {/* Tab 核心内容 */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'profile' && (
            <div>
              {username ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                        {username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-100">{username}</div>
                        <div className="text-[10px] text-zinc-500">已登录账号</div>
                      </div>
                    </div>
                    <button
                      onClick={onLogout}
                      className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-rose-400 flex items-center space-x-1 transition"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>退出登录</span>
                    </button>
                  </div>

                  {/* 修改密码 */}
                  <form onSubmit={handleChangePassword} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                      <span>修改密码</span>
                    </div>
                    {pwdMsg && (
                      <div className={`p-2 rounded text-xs ${pwdMsg.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                        {pwdMsg.text}
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">当前密码</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">新密码</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium transition"
                    >
                      提交修改
                    </button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`py-1.5 text-xs font-medium rounded-md transition ${authMode === 'login' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      登录
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`py-1.5 text-xs font-medium rounded-md transition ${authMode === 'register' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      注册新账号
                    </button>
                  </div>

                  {authError && (
                    <div className="p-2 rounded text-xs bg-rose-950/40 text-rose-400 border border-rose-800/40 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">用户名</label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={e => setAuthUsername(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                      placeholder="输入用户名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">密码</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                      placeholder="输入密码"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
                  >
                    {authMode === 'login' ? '立即登录' : '注册并登录'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'caldav' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                配置 Radicale 或其它兼容 CalDAV 标准的日历服务进行双向同步：
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">CalDAV 服务器 URL</label>
                <input
                  type="text"
                  value={settings.caldav_url || ''}
                  onChange={e => setSettings({ ...settings, caldav_url: e.target.value })}
                  placeholder="https://cal.example.com/radicale/user/calendar.ics/"
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">用户名</label>
                  <input
                    type="text"
                    value={settings.caldav_user || ''}
                    onChange={e => setSettings({ ...settings, caldav_user: e.target.value })}
                    placeholder="caldav-user"
                    className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">密码 / 访问凭证</label>
                  <input
                    type="password"
                    value={settings.caldav_password || ''}
                    onChange={e => setSettings({ ...settings, caldav_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">日历日程默认颜色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.calendar_color || '#3b82f6'}
                      onChange={e => setSettings({ ...settings, calendar_color: e.target.value })}
                      className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-zinc-300 font-mono">{settings.calendar_color || '#3b82f6'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">待办任务默认颜色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.todo_color || '#f43f5e'}
                      onChange={e => setSettings({ ...settings, todo_color: e.target.value })}
                      className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-zinc-300 font-mono">{settings.todo_color || '#f43f5e'}</span>
                  </div>
                </div>
              </div>

              {caldavTestMsg && (
                <div className={`p-2 rounded text-xs ${caldavTestMsg.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                  {caldavTestMsg.text}
                </div>
              )}

              {caldavSyncMsg && (
                <div className={`p-2 rounded text-xs flex items-center space-x-1.5 ${caldavSyncMsg.type === 'success' ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                  {caldavSyncMsg.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                  <span>{caldavSyncMsg.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleTestCaldav}
                  disabled={isTestingCaldav}
                  className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
                >
                  {isTestingCaldav ? '正在测试...' : '测试连接'}
                </button>
                <button
                  type="button"
                  onClick={handleSyncCaldav}
                  disabled={isSyncingCaldav}
                  className="px-3 py-1.5 text-xs rounded bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium flex items-center space-x-1 transition disabled:opacity-50"
                  title="立即从 Radicale CalDAV 同步最新日历和待办"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCaldav ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCaldav ? '正在同步...' : '立即同步日历'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  保存配置并同步
                </button>
                {saveSuccess && <span className="text-xs text-emerald-400 flex items-center space-x-1"><Check className="w-3.5 h-3.5" /><span>已保存</span></span>}
              </div>
            </div>
          )}

          {activeTab === 'weather' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                配置月视图日历格子天气数据来源：
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">城市 / 地区代码</label>
                <input
                  type="text"
                  value={settings.location_code || 'Shanghai'}
                  onChange={e => setSettings({ ...settings, location_code: e.target.value })}
                  placeholder="Shanghai 或 Beijing"
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">天气服务提供商</label>
                <select
                  value={settings.weather_provider || 'open-meteo'}
                  onChange={e => setSettings({ ...settings, weather_provider: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                >
                  <option value="open-meteo">Open-Meteo (免 Key 高性能)</option>
                  <option value="wttr">wttr.in 气象接口</option>
                  <option value="offline">离线智能预测 (确定性模拟)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition"
                >
                  保存配置
                </button>
                {saveSuccess && <span className="ml-2 text-xs text-emerald-400">已保存</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
