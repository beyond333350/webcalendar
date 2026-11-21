import React, { useState, useEffect } from 'react';
import { CalendarEvent, ItemType, CalDAVSource } from '../types';
import { X, Calendar as CalendarIcon, CheckSquare } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => Promise<void>;
  initialEvent?: CalendarEvent | null;
  defaultDate?: string;
  defaultType?: ItemType;
  sources?: CalDAVSource[];
}

const PRESET_COLORS = [
  { label: '红色 (日程默认)', value: '#ef4444' },
  { label: '蓝色 (待办默认)', value: '#3b82f6' },
  { label: '粉红', value: '#f43f5e' },
  { label: '亮橙', value: '#f97316' },
  { label: '青绿', value: '#10b981' },
  { label: '紫色', value: '#a855f7' }
];

const PRESET_CATEGORIES = ['默认', '工作', '生活', '学习', '项目', '健康'];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  defaultDate,
  defaultType = 'event',
  sources = []
}) => {
  const [type, setType] = useState<ItemType>(defaultType);
  const [sourceId, setSourceId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState(defaultType === 'todo' ? '#3b82f6' : '#ef4444');
  const [category, setCategory] = useState('默认');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      const currentType = initialEvent.type || 'event';
      setType(currentType);
      setSourceId(initialEvent.source_id || '');
      setTitle(initialEvent.title || '');
      setDescription(initialEvent.description || '');
      setStartDate(initialEvent.start_date || defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime(initialEvent.start_time || '');
      setEndTime(initialEvent.end_time || '');
      setColor(initialEvent.color || (currentType === 'todo' ? '#3b82f6' : '#ef4444'));
      setCategory(initialEvent.category || '默认');
    } else {
      const currentType = defaultType || 'event';
      setType(currentType);
      setTitle('');
      setDescription('');
      setStartDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setCategory('默认');

      // 自动选中该类型的默认或首个集合源并联动其颜色
      const matching = sources.filter(s => s.type === currentType && s.enabled);
      const defaultSrc = matching.find(s => s.is_default) || matching[0];
      if (defaultSrc) {
        setSourceId(defaultSrc.id);
        setColor(defaultSrc.color || (currentType === 'todo' ? '#3b82f6' : '#ef4444'));
      } else {
        setSourceId('');
        setColor(currentType === 'todo' ? '#3b82f6' : '#ef4444');
      }
    }
  }, [initialEvent, defaultDate, defaultType, sources, isOpen]);

  if (!isOpen) return null;

  const matchingSources = sources.filter(s => s.type === type && s.enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialEvent?.id,
        source_id: sourceId || undefined,
        title: title.trim(),
        description: description.trim(),
        type,
        start_date: startDate,
        end_date: startDate,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        color,
        category,
        is_completed: initialEvent?.is_completed ?? 0
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e1e22] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* 对话框头部 */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${type === 'todo' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <h3 className="text-sm font-semibold text-zinc-100">
              {initialEvent ? '编辑事项' : (type === 'todo' ? '新建日常待办' : '新建日历日程')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 类型切换 */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setType('event');
                const matching = sources.filter(s => s.type === 'event' && s.enabled);
                const defaultSrc = matching.find(s => s.is_default) || matching[0];
                if (defaultSrc) {
                  setSourceId(defaultSrc.id);
                  setColor(defaultSrc.color || '#ef4444');
                } else {
                  setSourceId('');
                  setColor('#ef4444');
                }
              }}
              className={`py-1.5 text-xs font-medium rounded-md flex items-center justify-center space-x-1.5 transition ${
                type === 'event'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>日程事项 (Event)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('todo');
                const matching = sources.filter(s => s.type === 'todo' && s.enabled);
                const defaultSrc = matching.find(s => s.is_default) || matching[0];
                if (defaultSrc) {
                  setSourceId(defaultSrc.id);
                  setColor(defaultSrc.color || '#3b82f6');
                } else {
                  setSourceId('');
                  setColor('#3b82f6');
                }
              }}
              className={`py-1.5 text-xs font-medium rounded-md flex items-center justify-center space-x-1.5 transition ${
                type === 'todo'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>待办任务 (Todo)</span>
            </button>
          </div>

          {/* 所属日历/待办集合下拉选择 */}
          {matchingSources.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center justify-between">
                <span>目标集合 (CalDAV 同步目标)</span>
                <span className="text-[10px] text-zinc-500">将推送到选中的服务集合</span>
              </label>
              <select
                value={sourceId}
                onChange={e => {
                  const selId = e.target.value;
                  setSourceId(selId);
                  const sel = sources.find(s => s.id === selId);
                  if (sel) setColor(sel.color);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500"
              >
                {matchingSources.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_default ? '(默认)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              标题 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：团队周会、完成技术文档"
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500 transition"
            />
          </div>

          {/* 日期与时间 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">日期</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">标签颜色</label>
            <div className="flex items-center space-x-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full transition flex items-center justify-center border-2 ${
                    color === c.value ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">分类</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    category === cat
                      ? 'bg-zinc-700 text-zinc-100 font-semibold'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 描述备注 */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">详细描述 / 备注</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="选填详细信息..."
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-md text-zinc-100 focus:outline-hidden focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* 底部按钮 */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
