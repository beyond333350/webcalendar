import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Settings, User, RefreshCw, PanelLeft } from 'lucide-react';
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
  onToggleLeftSidebar?: () => void;
  isLeftSidebarOpen?: boolean;
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
  username,
  onToggleLeftSidebar,
  isLeftSidebarOpen
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-zinc-800 bg-[#18181b] px-3 sm:px-6 flex items-center justify-between select-none flex-shrink-0 z-20">
      {/* 左侧：侧边栏切换、Logo & 标题 */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onToggleLeftSidebar && (
          <button
            onClick={onToggleLeftSidebar}
            className={`p-1.5 sm:p-2 rounded-md transition border ${
              isLeftSidebarOpen
                ? 'bg-zinc-800 text-blue-400 border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-transparent'
            }`}
            title="切换近3天待办日程侧边栏"
            aria-label="切换近3天待办日程侧边栏"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="font-semibold text-sm sm:text-base md:text-lg text-zinc-100 tracking-wide truncate">
            WebCalendar
          </span>
        </div>
      </div>

      {/* 中间：月份切换 */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <button
          onClick={onToday}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          今天
        </button>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={onPrevMonth}
            className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition"
            title="上个月"
            aria-label="上个月"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="px-1.5 sm:px-3 text-xs sm:text-sm font-semibold text-zinc-200 min-w-[85px] sm:min-w-[110px] text-center">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </span>
          <button
            onClick={onNextMonth}
            className="p-1 sm:p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition"
            title="下个月"
            aria-label="下个月"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* 右侧：刷新按钮、新建按钮 & 用户设置 */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="刷新日历与待办数据 (每5分钟自动静默刷新)"
          className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-zinc-400'}`} />
          <span className="hidden md:inline">刷新</span>
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="hidden sm:inline">新建日程 / 待办</span>
          <span className="sm:hidden">新建</span>
        </button>

        <button
          onClick={onOpenSettingsModal}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          title={username ? `已登录: ${username}` : '设置 / 登录'}
        >
          {username ? (
            <>
              <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="max-w-[50px] sm:max-w-[80px] truncate hidden xs:inline">{username}</span>
            </>
          ) : (
            <>
              <Settings className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="hidden xs:inline">设置</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
