import React from 'react';
import { CalendarEvent } from '../types';
import { format, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CheckCircle2, Circle, Clock, CheckSquare } from 'lucide-react';

interface SidebarRecentDaysProps {
  events: CalendarEvent[];
  onToggleTodo: (event: CalendarEvent) => void;
  onSelectDate: (dateStr: string) => void;
  onOpenCreateForDate: (dateStr: string) => void;
}

export const SidebarRecentDays: React.FC<SidebarRecentDaysProps> = ({
  events,
  onToggleTodo,
  onSelectDate,
  onOpenCreateForDate
}) => {
  const today = new Date();
  const dayList = [
    { label: '今天', date: today, key: 'today' },
    { label: '明天', date: addDays(today, 1), key: 'tomorrow' },
    { label: '后天', date: addDays(today, 2), key: 'afterTomorrow' }
  ];

  return (
    <aside className="w-80 border-r border-zinc-800 bg-[#18181b] flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckSquare className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-zinc-100">近期 3 天日程待办</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {dayList.map(({ label, date }) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayEvents = events.filter(e => e.start_date === dateStr);

          return (
            <div key={dateStr} className="bg-[#222225] rounded-lg border border-zinc-800/80 p-3 shadow-sm">
              {/* 日期标题 */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/60">
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-zinc-800 text-blue-400 border border-zinc-700/50">
                    {label}
                  </span>
                  <span className="text-xs font-medium text-zinc-300">
                    {format(date, 'M月d日 EEEE', { locale: zhCN })}
                  </span>
                </div>
                <button
                  onClick={() => onSelectDate(dateStr)}
                  className="text-[11px] text-zinc-400 hover:text-blue-400 transition"
                >
                  详情
                </button>
              </div>

              {/* 当日事项列表 */}
              <div className="space-y-1.5">
                {dayEvents.length === 0 ? (
                  <div className="py-2 text-center text-xs text-zinc-500">
                    暂无日程或待办
                  </div>
                ) : (
                  dayEvents.map(item => {
                    const isTodo = item.type === 'todo';
                    const isDone = Boolean(item.is_completed);

                    return (
                      <div
                        key={item.id}
                        className={`group flex items-start space-x-2 p-2 rounded-md transition text-xs border ${
                          isDone
                            ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                            : 'bg-zinc-800/40 hover:bg-zinc-800/80 border-zinc-700/40 text-zinc-200'
                        }`}
                      >
                        {isTodo ? (
                          <button
                            onClick={() => onToggleTodo(item)}
                            className="mt-0.5 flex-shrink-0 text-zinc-400 hover:text-blue-400 transition"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span
                            className="w-1.5 h-3.5 mt-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color || '#3b82f6' }}
                          />
                        )}

                        <div className="flex-1 min-w-0" onClick={() => onSelectDate(dateStr)}>
                          <div className={`truncate font-medium ${isDone ? 'line-through' : ''}`}>
                            {item.title}
                          </div>
                          {item.start_time && (
                            <div className="flex items-center space-x-1 text-[10px] text-zinc-400 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{item.start_time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 快速在该日新建按钮 */}
              <button
                onClick={() => onOpenCreateForDate(dateStr)}
                className="mt-2 w-full py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded border border-dashed border-zinc-800 transition"
              >
                + 添加本日日程/待办
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
