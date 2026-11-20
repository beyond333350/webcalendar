import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  username: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenCreateModal,
  onOpenSettingsModal,
  onRefresh,
  isRefreshing,
  username
}) => {
  return (
    <header className="h-16 border-b border-zinc-800 bg-[#18181b] px-6 flex items-center justify-between select-none">
      {/* 左侧：Logo & 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="font-semibold text-lg text-zinc-100 tracking-wide">WebCalendar</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">Full Calendar</span>
        </div>
      </div>

      {/* 中间：月份切换 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          今天
        </button>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={onPrevMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition"
            title="上个月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-zinc-200 min-w-[110px] text-center">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </span>
          <button
            onClick={onNextMonth}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition"
            title="下个月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 右侧：刷新按钮、新建按钮 & 用户设置 */}
      <div className="flex items-center space-x-2.5">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="刷新日历与待办数据 (支持每5分钟自动静默刷新)"
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-zinc-400'}`} />
          <span className="hidden sm:inline">刷新</span>
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>新建日程 / 待办</span>
        </button>

        <button
          onClick={onOpenSettingsModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          {username ? (
            <>
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="max-w-[80px] truncate">{username}</span>
            </>
          ) : (
            <>
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span>设置 / 登录</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
