import React, { useState, useEffect } from 'react';
import { UserSettings, CalDAVSource } from '../types';
import { api, clearToken } from '../api';
import { X, User, Cloud, RefreshCw, KeyRound, LogOut, Check, AlertCircle, Plus, Trash2, Edit3, Calendar, CheckSquare, Link2, Star } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
  onAuthSuccess: (username: string) => void;
  onLogout: () => void;
  onSyncSuccess?: () => void;
}

const PRESET_SOURCE_COLORS = [
  { label: '红色', value: '#ef4444' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '粉红', value: '#f43f5e' },
  { label: '亮橙', value: '#f97316' },
  { label: '青绿', value: '#10b981' },
  { label: '紫色', value: '#a855f7' },
  { label: '浅青', value: '#06b6d4' },
  { label: '琥珀', value: '#f59e0b' }
];

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

  // CalDAV 多集合源列表与全局设置
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    location_code: 'Shanghai',
    weather_provider: 'open-meteo',
    caldav_url: '',
    caldav_todo_url: '',
    caldav_user: '',
    caldav_password: '',
    calendar_color: '#ef4444',
    todo_color: '#3b82f6'
  });

  const [sources, setSources] = useState<CalDAVSource[]>([]);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [editingSource, setEditingSource] = useState<Partial<CalDAVSource>>({
    name: '',
    type: 'event',
    url: '',
    color: '#ef4444',
    username: '',
    password: '',
    is_default: 1,
    enabled: 1
  });
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [sourceTestMsgs, setSourceTestMsgs] = useState<Record<string, { text: string; type: 'success' | 'error' }>>({});
  const [formError, setFormError] = useState('');

  const [caldavSyncMsg, setCaldavSyncMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncingCaldav, setIsSyncingCaldav] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSources = async () => {
    try {
      const list = await api.getCalDAVSources();
      setSources(list);
    } catch (e) {
      console.error('加载 CalDAV 集合列表失败:', e);
    }
  };

  useEffect(() => {
    if (isOpen && username) {
      api.getSettings().then(setSettings).catch(() => {});
      loadSources();
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

  const handleOpenAddSource = (type: 'event' | 'todo') => {
    setEditingSource({
      name: type === 'event' ? '工作日历' : '日常待办',
      type,
      url: '',
      color: type === 'event' ? '#ef4444' : '#3b82f6',
      username: '',
      password: '',
      is_default: sources.filter(s => s.type === type).length === 0 ? 1 : 0,
      enabled: 1
    });
    setFormError('');
    setIsEditingSource(true);
  };

  const handleOpenEditSource = (src: CalDAVSource) => {
    setEditingSource({ ...src });
    setFormError('');
    setIsEditingSource(true);
  };

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource.name?.trim() || !editingSource.url?.trim()) {
      setFormError('集合名称和集合 URL 不能为空');
      return;
    }
    try {
      if (editingSource.id) {
        await api.updateCalDAVSource(editingSource.id, editingSource);
      } else {
        await api.createCalDAVSource(editingSource);
      }
      setIsEditingSource(false);
      setEditingSource({ name: '', type: 'event', url: '', color: '#ef4444', username: '', password: '', is_default: 0, enabled: 1 });
      await loadSources();
      handleSyncCaldav();
    } catch (err: any) {
      setFormError(err.message || '保存集合失败');
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('确定要删除此集合源吗？该集合在本地已同步的事项也将被清除。')) return;
    try {
      await api.deleteCalDAVSource(id);
      await loadSources();
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const handleTestSource = async (src: Partial<CalDAVSource>) => {
    if (!src.url) return;
    const testId = src.id || 'form';
    setTestingSourceId(testId);
    try {
      const res = await api.testCalDAV({
        url: src.url,
        username: src.username || settings.caldav_user,
        password: src.password || settings.caldav_password
      });
      setSourceTestMsgs(prev => ({
        ...prev,
        [testId]: { text: res.message, type: res.success ? 'success' : 'error' }
      }));
    } catch (err: any) {
      setSourceTestMsgs(prev => ({
        ...prev,
        [testId]: { text: `测试失败: ${err.message}`, type: 'error' }
      }));
    } finally {
      setTestingSourceId(null);
    }
  };

  const handleSetDefaultSource = async (src: CalDAVSource) => {
    try {
      await api.updateCalDAVSource(src.id, { ...src, is_default: 1 });
      await loadSources();
    } catch (err: any) {
      alert(err.message || '设置默认失败');
    }
  };

  const handleToggleEnableSource = async (src: CalDAVSource) => {
    try {
      await api.updateCalDAVSource(src.id, { ...src, enabled: !src.enabled });
      await loadSources();
    } catch (err: any) {
      alert(err.message || '切换状态失败');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || '保存设置失败');
    }
  };

  const handleSyncCaldav = async () => {
    setIsSyncingCaldav(true);
    setCaldavSyncMsg(null);
    try {
      await api.updateSettings(settings);
      const res = await api.syncCalDAV();
      setCaldavSyncMsg({ text: res.message, type: res.success ? 'success' : 'error' });
      await loadSources();
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#1e1e22] border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* 对话框头部 */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-zinc-100">应用设置与账号</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 导航 (支持横向滑动) */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/60 px-3 sm:px-4 pt-2 space-x-2 overflow-x-auto whitespace-nowrap flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-1 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition flex-shrink-0 ${
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
            className={`pb-2 px-1 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition flex-shrink-0 ${
              activeTab === 'caldav'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Radicale CalDAV 同步 ({sources.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`pb-2 px-1 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition flex-shrink-0 ${
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
        <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto space-y-4">
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
            <div className="space-y-4">
              <div className="text-xs text-zinc-400">
                支持配置多个 Radicale 或兼容 CalDAV 标准的日历与待办服务集合，为每个集合定制专属高亮颜色与默认分流：
              </div>

              {/* 默认全局认证凭据卡片 */}
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                    <span>默认 CalDAV 认证凭据</span>
                    <span className="text-[10px] text-zinc-500 font-normal">(下方集合未填独立账号时将继承此凭据)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-2.5 py-1 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-blue-400 font-medium transition"
                  >
                    保存凭据
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">默认用户名</label>
                    <input
                      type="text"
                      value={settings.caldav_user || ''}
                      onChange={e => setSettings({ ...settings, caldav_user: e.target.value })}
                      placeholder="beyond333350"
                      className="w-full px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">默认密码 / 访问凭证</label>
                    <input
                      type="password"
                      value={settings.caldav_password || ''}
                      onChange={e => setSettings({ ...settings, caldav_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              {/* 集合源列表控制栏 */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs font-semibold text-zinc-200">
                  日历与待办集合列表 ({sources.length})
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenAddSource('event')}
                    className="px-2.5 py-1 text-xs rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-medium flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    <span>添加日历集合</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAddSource('todo')}
                    className="px-2.5 py-1 text-xs rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>添加待办集合</span>
                  </button>
                </div>
              </div>

              {/* 内联新建/编辑集合表单 */}
              {isEditingSource && (
                <form onSubmit={handleSaveSource} className="p-3.5 rounded-lg bg-zinc-900 border border-blue-500/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-100 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: editingSource.color || '#ef4444' }} />
                      <span>{editingSource.id ? '编辑集合源' : (editingSource.type === 'todo' ? '新建待办集合' : '新建日历集合')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingSource(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-200 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-2 rounded text-xs bg-rose-950/40 text-rose-400 border border-rose-800/40 flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[11px] text-zinc-400 mb-1">集合名称 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={editingSource.name || ''}
                        onChange={e => setEditingSource({ ...editingSource, name: e.target.value })}
                        placeholder="例如：工作日历、私人待办、项目任务"
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">集合类型</label>
                      <select
                        value={editingSource.type || 'event'}
                        onChange={e => {
                          const newType = e.target.value as 'event' | 'todo';
                          setEditingSource({
                            ...editingSource,
                            type: newType,
                            color: newType === 'todo' ? '#3b82f6' : '#ef4444'
                          });
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      >
                        <option value="event">日历 (VEVENT)</option>
                        <option value="todo">待办 (VTODO)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">集合服务 URL <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingSource.url || ''}
                      onChange={e => setEditingSource({ ...editingSource, url: e.target.value })}
                      placeholder="https://rili.359261634.xyz/beyond333350/a2264f90-750d-cb51-fcd9-dffc825ff915/"
                      className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">专属高亮颜色</label>
                    <div className="flex items-center space-x-1.5">
                      {PRESET_SOURCE_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditingSource({ ...editingSource, color: c.value })}
                          className={`w-5 h-5 rounded-full transition border-2 ${editingSource.color === c.value ? 'border-white scale-110' : 'border-transparent opacity-80'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={editingSource.color || '#ef4444'}
                        onChange={e => setEditingSource({ ...editingSource, color: e.target.value })}
                        className="w-6 h-6 rounded border border-zinc-700 bg-transparent cursor-pointer ml-1"
                        title="自定义颜色"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">独立用户名 (选填)</label>
                      <input
                        type="text"
                        value={editingSource.username || ''}
                        onChange={e => setEditingSource({ ...editingSource, username: e.target.value })}
                        placeholder="留空使用默认凭据"
                        className="w-full px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">独立密码 (选填)</label>
                      <input
                        type="password"
                        value={editingSource.password || ''}
                        onChange={e => setEditingSource({ ...editingSource, password: e.target.value })}
                        placeholder="留空使用默认凭据"
                        className="w-full px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingSource.is_default)}
                        onChange={e => setEditingSource({ ...editingSource, is_default: e.target.checked ? 1 : 0 })}
                        className="rounded border-zinc-700 bg-zinc-800 text-blue-600"
                      />
                      <span>设为此类型（{editingSource.type === 'todo' ? '待办' : '日历'}）新建时的默认目标集合</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleTestSource(editingSource)}
                        disabled={testingSourceId === (editingSource.id || 'form')}
                        className="px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
                      >
                        {testingSourceId === (editingSource.id || 'form') ? '测试中...' : '测试该集合'}
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                      >
                        保存集合
                      </button>
                    </div>
                  </div>

                  {sourceTestMsgs[editingSource.id || 'form'] && (
                    <div className={`p-2 rounded text-xs ${sourceTestMsgs[editingSource.id || 'form'].type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                      {sourceTestMsgs[editingSource.id || 'form'].text}
                    </div>
                  )}
                </form>
              )}

              {/* 集合源列表 */}
              <div className="space-y-2">
                {sources.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-lg border border-dashed border-zinc-800">
                    暂未添加任何集合源，点击右上角【+ 添加日历集合】或【+ 添加待办集合】配置多条日历服务
                  </div>
                ) : (
                  sources.map(src => {
                    const isTodo = src.type === 'todo';
                    const isDef = Boolean(src.is_default);

                    return (
                      <div
                        key={src.id}
                        className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/90 hover:border-zinc-700 transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: src.color }}
                            />
                            <span className="text-xs font-semibold text-zinc-100 truncate">
                              {src.name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${isTodo ? 'bg-blue-950/60 text-blue-400 border border-blue-800/40' : 'bg-red-950/60 text-red-400 border border-red-800/40'}`}>
                              {isTodo ? '待办 VTODO' : '日历 VEVENT'}
                            </span>
                            {isDef && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40 flex items-center space-x-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>默认</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTestSource(src)}
                              disabled={testingSourceId === src.id}
                              className="px-2 py-0.5 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
                              title="测试该集合连通性"
                            >
                              {testingSourceId === src.id ? '测试中...' : '测试连接'}
                            </button>
                            {!isDef && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultSource(src)}
                                className="px-2 py-0.5 text-[11px] rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 transition"
                                title="设为该类型新建时的默认目标"
                              >
                                设为默认
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditSource(src)}
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                              title="编辑"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(src.id)}
                              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-zinc-400 truncate bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60">
                          {src.url}
                        </div>

                        {sourceTestMsgs[src.id] && (
                          <div className={`p-2 rounded text-xs ${sourceTestMsgs[src.id].type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                            {sourceTestMsgs[src.id].text}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 全局同步与状态栏 */}
              {caldavSyncMsg && (
                <div className={`p-2 rounded text-xs flex items-center space-x-1.5 ${caldavSyncMsg.type === 'success' ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'}`}>
                  {caldavSyncMsg.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                  <span>{caldavSyncMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] text-zinc-500">
                  支持多设备、多集合双向自动同步
                </span>
                <button
                  type="button"
                  onClick={handleSyncCaldav}
                  disabled={isSyncingCaldav}
                  className="px-4 py-1.5 text-xs rounded bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium flex items-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
                  title="立即从 Radicale CalDAV 同步所有集合中的日历和待办"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCaldav ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCaldav ? '正在全量同步...' : '立即同步所有日历与待办'}</span>
                </button>
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
