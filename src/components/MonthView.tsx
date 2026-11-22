import React from 'react';
import { CalendarEvent } from '../types';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, CheckCircle2, Circle } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  selectedDate,
  onSelectDate,
  onEditEvent
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  // 周一作为一周第一天 (weekStartsOn: 1)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 模拟/按日期确定天气图标
  const getWeatherIcon = (date: Date) => {
    const day = date.getDate();
    const mod = day % 4;
    if (mod === 0) return <span title="晴"><Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /></span>;
    if (mod === 1) return <span title="多云"><Cloud className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" /></span>;
    if (mod === 2) return <span title="小雨"><CloudRain className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" /></span>;
    return <span title="雪"><CloudSnow className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-300" /></span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#18181b] overflow-hidden select-none">
      {/* 星期表头 */}
      <div className="grid grid-cols-7 border-b border-zinc-800 bg-[#1c1c1f]">
        {weekDays.map((day, idx) => (
          <div
            key={day}
            className={`py-1 sm:py-2 text-center text-[11px] sm:text-xs font-semibold ${
              idx >= 5 ? 'text-zinc-400' : 'text-zinc-300'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子矩阵 */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 border-b border-r border-zinc-800">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          const isSelected = selectedDate === dateStr;

          // 获取该日期的事件与待办 (支持跨天事件区间匹配)
          const dayEvents = events.filter(e => {
            if (e.start_date === dateStr) return true;
            if (e.end_date && e.end_date > e.start_date) {
              return dateStr >= e.start_date && dateStr <= e.end_date;
            }
            return false;
          });
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const hiddenCount = dayEvents.length - maxVisible;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`border-t border-l border-zinc-800 p-1 sm:p-1.5 flex flex-col transition cursor-pointer relative active:bg-zinc-800/80 ${
                !isCurrentMonth ? 'bg-[#151518]/60 text-zinc-600' : 'bg-[#18181b] hover:bg-zinc-800/40'
              } ${isSelected ? 'ring-1 ring-blue-500 bg-blue-950/20' : ''}`}
            >
              {/* 格子顶部：天气与月日 (例如 9月11日显示 11/9) */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="opacity-80 hover:opacity-100 transition flex items-center">
                  {getWeatherIcon(day)}
                </span>
                <span
                  className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold leading-none ${
                    isDayToday
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isCurrentMonth
                      ? 'text-zinc-200'
                      : 'text-zinc-600'
                  }`}
                  title={format(day, 'yyyy年M月d日')}
                >
                  {`${format(day, 'd')}/${format(day, 'M')}`}
                </span>
              </div>

              {/* 事件与待办胶囊药丸 */}
              <div className="flex-1 overflow-hidden space-y-0.5 sm:space-y-1">
                {visibleEvents.map(event => {
                  const isDone = Boolean(event.is_completed);
                  const isTodo = event.type === 'todo';
                  const itemColor = event.color || (isTodo ? '#3b82f6' : '#ef4444');

                  return (
                    <div
                      key={event.id}
                      onClick={e => {
                        e.stopPropagation();
                        onEditEvent(event);
                      }}
                      className="px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] truncate flex items-center space-x-1 transition shadow-sm font-medium"
                      style={{
                        backgroundColor: `${itemColor}22`,
                        color: isTodo ? '#93c5fd' : '#fca5a5',
                        borderLeft: `2.5px solid ${itemColor}`
                      }}
                    >
                      {/* 图标区分待办与日程 */}
                      {isTodo ? (
                        isDone ? (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                        )
                      ) : (
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: itemColor }}
                        />
                      )}

                      {event.start_time && (
                        <span className="text-[8px] sm:text-[9px] opacity-80 flex-shrink-0">{event.start_time}</span>
                      )}
                      <span className={`truncate ${isDone ? 'line-through opacity-60' : ''}`}>
                        {event.title}
                      </span>
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <div className="text-[9px] sm:text-[10px] text-zinc-500 px-0.5 sm:px-1 font-medium">
                    +{hiddenCount} 项更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
