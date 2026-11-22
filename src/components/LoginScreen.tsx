import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserAuth } from '../types';
import { Calendar as CalendarIcon, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (auth: UserAuth) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);

  useEffect(() => {
    api.getPublicConfig().then(cfg => {
      setAllowRegistration(cfg.allow_registration);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    if (mode === 'register' && !allowRegistration) {
      setError('管理员已暂停新用户注册');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const auth = await api.login(username.trim(), password);
        onLoginSuccess(auth);
      } else {
        const auth = await api.register(username.trim(), password);
        onLoginSuccess(auth);
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? '登录失败，请检查账号密码' : '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#18181b] text-zinc-100 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-[#222225] border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Logo & 标题 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-lg shadow-red-500/10">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">WebCalendar</h1>
          <p className="text-xs text-zinc-400 mt-1">Obsidian 风格私有日历待办</p>
        </div>

        {/* 模式切换 (登录 / 注册) */}
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              mode === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>用户登录</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              mode === 'register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>新用户注册</span>
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-2.5 rounded-lg text-xs bg-rose-950/40 text-rose-300 border border-rose-800/40 flex items-center space-x-2 mb-4 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 注册已关闭提示 */}
        {mode === 'register' && !allowRegistration && (
          <div className="p-2.5 rounded-lg text-xs bg-amber-950/40 text-amber-300 border border-amber-800/40 flex items-center space-x-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>管理员已关闭新用户注册，请联系管理员分配账户。</span>
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">用户名</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">密码</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (mode === 'register' && !allowRegistration)}
            className="w-full min-h-[40px] py-2 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-98 text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-1.5 mt-2"
          >
            {loading ? (
              <span>正在处理...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>立即登录</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>注册并进入系统</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-4">
          未登录状态下所有日历与待办数据均受密码保护
        </div>
      </div>
    </div>
  );
};
