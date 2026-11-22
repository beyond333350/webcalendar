import React from 'react';
import { CalendarEvent } from '../types';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { X, Plus, CheckCircle2, Circle, Clock, Trash2, Edit3, Calendar, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';

interface DayDrawerProps {
  isOpen: boolean;
  selectedDate: string | null;
  events: CalendarEvent[];
  onClose: () => void;
  onToggleCollapse: () => void;
  onToggleTodo: (event: CalendarEvent) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onOpenCreateForDate: (dateStr: string, defaultType?: 'event' | 'todo') => void;
}

export const DayDrawer: React.FC<DayDrawerProps> = ({
  isOpen,
  selectedDate,
  events,
  onClose,
  onToggleCollapse,
  onToggleTodo,
  onEditEvent,
  onDeleteEvent,
  onOpenCreateForDate
}) => {
  const dateObj = selectedDate ? parseISO(selectedDate) : new Date();
  const dayEvents = selectedDate ? events.filter(e => e.start_date === selectedDate) : [];
  const currentDateStr = selectedDate || format(new Date(), 'yyyy-MM-dd');

  return (
    <>
      {/* 移动端与平板端半透明暗黑遮罩 */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-label="关闭详情抽屉"
        />
      )}

      <div className={`flex h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen
          ? 'fixed inset-y-0 right-0 z-40 w-full xs:w-80 sm:w-88 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:shadow-none lg:w-auto translate-x-0'
          : 'fixed inset-y-0 right-0 z-40 translate-x-full pointer-events-none lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:w-0'
      }`}>
        {/* 桌面端边缘向左/向右小箭头切换按钮 */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-4 h-12 bg-[#222225] hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 border border-zinc-700/80 rounded-l-md shadow-md transition"
          title={isOpen ? '收起右侧日程待办 (向右收起)' : '展开右侧日程待办 (向左展开)'}
        >
          {isOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* 抽屉主体 */}
        <aside
          className={`bg-[#18181b] flex flex-col h-full w-full overflow-hidden select-none transition-all duration-300 ease-in-out ${
            isOpen ? 'border-l border-zinc-800 opacity-100 lg:w-80' : 'border-l-0 opacity-0 pointer-events-none lg:w-0'
          }`}
        >
          {/* 头部 */}
          <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between min-w-[280px]">
            <div>
              <div className="text-xs text-zinc-400 font-medium">日程与待办清单</div>
              <div className="text-base font-bold text-zinc-100 mt-0.5">
                {format(dateObj, 'M月d日 EEEE', { locale: zhCN })}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
                title="收起面板"
                aria-label="收起面板"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
                title="关闭"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 顶部独立快捷新建按钮：红色添加日历 / 蓝色添加待办 (适配触控热区) */}
          <div className="p-3 border-b border-zinc-800 min-w-[280px] grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenCreateForDate(currentDateStr, 'event')}
              className="min-h-[40px] py-2 px-3 text-xs font-semibold rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 flex items-center justify-center space-x-1.5 transition active:scale-98 shadow-xs"
              title="添加日历日程（将同步至工作日历）"
            >
              <Plus className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>添加日历</span>
            </button>
            <button
              onClick={() => onOpenCreateForDate(currentDateStr, 'todo')}
              className="min-h-[40px] py-2 px-3 text-xs font-semibold rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center space-x-1.5 transition active:scale-98 shadow-xs"
              title="添加待办任务（将同步至日常待办）"
            >
              <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>添加待办</span>
            </button>
          </div>

          {/* 事项列表 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-w-[280px]">
            {dayEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center">
                <Calendar className="w-8 h-8 text-zinc-600 mb-2 stroke-1" />
                <span>当日尚无安排</span>
                <span className="text-[11px] text-zinc-600 mt-1">点击上方按钮即可快速创建</span>
              </div>
            ) : (
              dayEvents.map(item => {
                const isTodo = item.type === 'todo';
                const isDone = Boolean(item.is_completed);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition text-xs flex flex-col space-y-2 group ${
                      isDone
                        ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                        : 'bg-[#222225] border-zinc-800 hover:border-zinc-700 text-zinc-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        {isTodo ? (
                          <button
                            onClick={() => onToggleTodo(item)}
                            className="mt-0.5 p-1 -m-1 flex-shrink-0 text-zinc-400 hover:text-blue-400 transition"
                            title={isDone ? '标记为未完成' : '标记为已完成'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="w-2 h-4 mt-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color || '#ef4444' }}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold text-sm ${isDone ? 'line-through' : 'text-zinc-100'}`}>
                            {item.title}
                          </div>
                          {item.description && (
                            <div className="text-zinc-400 mt-1 line-clamp-2 text-xs">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => onEditEvent(item)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded transition"
                          title="编辑"
                          aria-label="编辑"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition"
                          title="删除"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 时间与分类标签 */}
                    <div className="flex items-center space-x-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      {item.start_time ? (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{item.start_time} {item.end_time ? `- ${item.end_time}` : ''}</span>
                        </div>
                      ) : (
                        <span>全天</span>
                      )}
                      {item.category && item.category !== '默认' && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部补充快捷新建栏 */}
          <div className="p-3 border-t border-zinc-800 min-w-[280px] bg-zinc-900/40 grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenCreateForDate(currentDateStr, 'event')}
              className="min-h-[38px] py-1.5 px-2.5 text-xs font-medium rounded bg-zinc-800/80 hover:bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center space-x-1 transition active:scale-98"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              <span>新建日历</span>
            </button>
            <button
              onClick={() => onOpenCreateForDate(currentDateStr, 'todo')}
              className="min-h-[38px] py-1.5 px-2.5 text-xs font-medium rounded bg-zinc-800/80 hover:bg-blue-950/40 text-blue-400 border border-blue-500/30 flex items-center justify-center space-x-1 transition active:scale-98"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>新建待办</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};
