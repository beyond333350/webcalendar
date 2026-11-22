import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalDAVSource } from './types';
import { api, getToken, clearToken, getStoredIsAdmin } from './api';
import { Header } from './components/Header';
import { SidebarRecentDays } from './components/SidebarRecentDays';
import { MonthView } from './components/MonthView';
import { DayDrawer } from './components/DayDrawer';
import { EventModal } from './components/EventModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { addMonths, subMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [username, setUsername] = useState<string | null>(localStorage.getItem('webcalendar_username'));
  const [isAdmin, setIsAdmin] = useState<boolean>(getStoredIsAdmin());
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));

  // 右侧抽屉默认折叠不显示
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 顶部刷新状态与 Toast 提示
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 左侧栏折叠状态 (支持保存到 localStorage，移动端与平板小屏默认收起，桌面默认展开)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    const saved = localStorage.getItem('webcalendar_left_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleLeftSidebar = () => {
    setIsLeftSidebarOpen(prev => {
      const next = !prev;
      localStorage.setItem('webcalendar_left_sidebar_open', String(next));
      return next;
    });
  };

  // 左侧面板可调节宽度 (限制 220px ~ 500px, 默认 300px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('webcalendar_sidebar_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return Math.max(220, Math.min(500, parsed));
    }
    return 300;
  });
  const [isDragging, setIsDragging] = useState(false);

  // 模态框状态
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventModalDate, setEventModalDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [eventModalDefaultType, setEventModalDefaultType] = useState<'event' | 'todo'>('event');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [sources, setSources] = useState<CalDAVSource[]>([]);

  const loadSources = async () => {
    try {
      const list = await api.getCalDAVSources();
      setSources(list);
    } catch {
      // 容错
    }
  };

  // 初始化加载与鉴权检查（彻底去除 demo 自动登录）
  useEffect(() => {
    const initApp = async () => {
      const currentToken = getToken();
      if (!currentToken) {
        setTokenState(null);
        setUsername(null);
        setIsAdmin(false);
        setIsInitializing(false);
        return;
      }

      try {
        const me = await api.getMe();
        setUsername(me.username);
        setIsAdmin(me.isAdmin);
        await Promise.all([loadEvents(true), loadSources()]);
      } catch {
        clearToken();
        setTokenState(null);
        setUsername(null);
        setIsAdmin(false);
      } finally {
        setIsInitializing(false);
      }
    };
    initApp();
  }, []);

  // 每 5 分钟自动静默刷新日历与待办数据
  useEffect(() => {
    const FIVE_MINUTES = 5 * 60 * 1000;
    const timer = setInterval(() => {
      handleRefresh();
    }, FIVE_MINUTES);
    return () => clearInterval(timer);
  }, []);

  // 左右区域拖拽宽度监听
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(220, Math.min(500, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const finalWidth = Math.max(220, Math.min(500, e.clientX));
      setSidebarWidth(finalWidth);
      localStorage.setItem('webcalendar_sidebar_width', String(finalWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // 静默异步刷新（只刷新日历和待办数据，不刷新整页，若配置了 CalDAV 同时同步最新数据）
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getEvents(true);
      setEvents(data);
      await loadSources();
      showToast(`已刷新日历与待办，共 ${data.length} 项事项`);
    } catch (err: any) {
      console.error('刷新日程待办失败:', err);
      showToast('刷新完成（部分数据使用本地缓存）');
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadEvents = async (sync: boolean = false) => {
    try {
      const data = await api.getEvents(sync);
      setEvents(data);
    } catch {
      // 若后端尚未就绪或未授权，载入初始演示数据
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setEvents([
        {
          id: 'demo-1',
          title: 'WebCalendar 项目上线评审',
          description: '检查 Obsidian 暗黑主题适配与 Docker 部署',
          type: 'event',
          start_date: todayStr,
          start_time: '10:00',
          end_time: '11:30',
          color: '#ef4444',
          category: '工作'
        },
        {
          id: 'demo-2',
          title: '配置 Radicale CalDAV 同步',
          description: '测试 1Panel 容器编排端口映射与数据持久化',
          type: 'todo',
          start_date: todayStr,
          start_time: '14:00',
          is_completed: 0,
          color: '#3b82f6',
          category: '项目'
        }
      ]);
    }
  };

  // 点击某天打开右侧抽屉
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDrawerOpen(true);
  };

  // 手动点击小箭头切换抽屉展开/折叠
  const handleToggleDrawer = () => {
    if (!isDrawerOpen && !selectedDate) {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setIsDrawerOpen(prev => !prev);
  };

  // 待办完成状态切换
  const handleToggleTodo = async (event: CalendarEvent) => {
    const nextCompleted = event.is_completed ? 0 : 1;
    const updated = { ...event, is_completed: nextCompleted };
    setEvents(prev => prev.map(e => (e.id === event.id ? updated : e)));

    try {
      await api.updateEvent(event.id, updated);
    } catch {
      // 容错保留本地状态
    }
  };

  // 保存新建或编辑的事件
  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    if (eventData.id) {
      // 更新
      try {
        await api.updateEvent(eventData.id, eventData);
        await loadEvents();
      } catch {
        setEvents(prev => prev.map(e => (e.id === eventData.id ? { ...e, ...eventData } as CalendarEvent : e)));
      }
    } else {
      // 新建
      try {
        await api.createEvent(eventData);
        await loadEvents();
      } catch {
        const newEvt: CalendarEvent = {
          id: `local-${Date.now()}`,
          title: eventData.title || '',
          description: eventData.description,
          type: eventData.type || 'event',
          start_date: eventData.start_date || format(new Date(), 'yyyy-MM-dd'),
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          color: eventData.color || (eventData.type === 'todo' ? '#3b82f6' : '#ef4444'),
          category: eventData.category || '默认',
          is_completed: 0
        };
        setEvents(prev => [...prev, newEvt]);
      }
    }
  };

  // 删除事件
  const handleDeleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      await api.deleteEvent(id);
    } catch {
      // 容错
    }
  };

  // 打开创建模态框
  const handleOpenCreate = (dateStr?: string, defaultType: 'event' | 'todo' = 'event') => {
    setEditingEvent(null);
    setEventModalDate(dateStr || selectedDate || format(new Date(), 'yyyy-MM-dd'));
    setEventModalDefaultType(defaultType);
    setIsEventModalOpen(true);
  };

  // 打开编辑模态框
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventModalDate(event.start_date);
    setEventModalDefaultType(event.type || 'event');
    setIsEventModalOpen(true);
  };

  const handleLogout = () => {
    clearToken();
    setTokenState(null);
    setUsername(null);
    setIsAdmin(false);
    setEvents([]);
    setSources([]);
    setIsSettingsModalOpen(false);
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#18181b] text-zinc-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">正在加载安全环境...</span>
        </div>
      </div>
    );
  }

  // 强制登录拦截：未登录用户展示全屏登录与注册卡片
  if (!token || !username) {
    return (
      <LoginScreen
        onLoginSuccess={auth => {
          setTokenState(auth.token);
          setUsername(auth.username);
          setIsAdmin(Boolean(auth.isAdmin));
          loadEvents(true);
          loadSources();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#18181b] text-zinc-100">
      {/* 顶部标题栏与控制器 */}
      <Header
        currentDate={currentDate}
        onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
        onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        onToday={() => {
          const now = new Date();
          setCurrentDate(now);
          setSelectedDate(format(now, 'yyyy-MM-dd'));
        }}
        onOpenCreateModal={() => handleOpenCreate()}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        username={username}
        onToggleLeftSidebar={handleToggleLeftSidebar}
        isLeftSidebarOpen={isLeftSidebarOpen}
      />

      {/* 主体三栏布局 */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 移动端与平板端左侧栏半透明暗黑遮罩 */}
        {isLeftSidebarOpen && (
          <div
            onClick={handleToggleLeftSidebar}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
            aria-label="关闭侧边栏"
          />
        )}

        {/* 左侧栏：近 3 天待办日程 (支持移动端浮层抽屉与桌面端折叠/拖拽调节宽度) */}
        <div className={`flex h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${
          isLeftSidebarOpen
            ? 'fixed inset-y-0 left-0 z-40 w-72 sm:w-80 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:shadow-none lg:w-auto translate-x-0'
            : 'fixed inset-y-0 left-0 z-40 -translate-x-full pointer-events-none lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:w-0'
        }`}>
          <SidebarRecentDays
            events={events}
            width={sidebarWidth}
            isOpen={isLeftSidebarOpen}
            onToggleCollapse={handleToggleLeftSidebar}
            onToggleTodo={handleToggleTodo}
            onSelectDate={handleSelectDate}
            onOpenCreateForDate={(dateStr, type) => handleOpenCreate(dateStr, type)}
          />

          {/* 桌面端边缘向左/向右切换小箭头按钮 */}
          <button
            onClick={handleToggleLeftSidebar}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-4 h-12 bg-[#222225] hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 border border-zinc-700/80 rounded-r-md shadow-md transition"
            title={isLeftSidebarOpen ? '收起左侧近3天日程 (向左收起)' : '展开左侧近3天日程 (向右展开)'}
          >
            {isLeftSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 左侧与中间区域可拖拽分割条 (仅在桌面大屏展开时显示) */}
        {isLeftSidebarOpen && (
          <div
            onMouseDown={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            className={`hidden lg:flex w-1.5 cursor-col-resize z-10 transition-colors items-center justify-center select-none group border-x border-zinc-900/50 ${
              isDragging ? 'bg-blue-500' : 'bg-[#222225] hover:bg-blue-500/70'
            }`}
            title="按住拖拽调节左右区域大小"
          >
            <div className="w-0.5 h-8 rounded-full bg-zinc-600 group-hover:bg-blue-300 opacity-40 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* 中间栏：月视图日历网格 */}
        <MonthView
          currentDate={currentDate}
          events={events}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          onEditEvent={handleEditEvent}
        />

        {/* 右侧抽屉：默认折叠，点击具体天数或小箭头展开 */}
        <DayDrawer
          isOpen={isDrawerOpen}
          selectedDate={selectedDate}
          events={events}
          onClose={() => setIsDrawerOpen(false)}
          onToggleCollapse={handleToggleDrawer}
          onToggleTodo={handleToggleTodo}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onOpenCreateForDate={(dateStr, type) => handleOpenCreate(dateStr, type)}
        />
      </div>

      {/* 弹出框 */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        initialEvent={editingEvent}
        defaultDate={eventModalDate}
        defaultType={eventModalDefaultType}
        sources={sources}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        username={username}
        isAdmin={isAdmin}
        onAuthSuccess={user => {
          setUsername(user);
          loadEvents(true);
          loadSources();
        }}
        onUsernameChanged={newU => {
          setUsername(newU);
        }}
        onLogout={handleLogout}
        onSyncSuccess={() => {
          loadEvents(false);
          loadSources();
        }}
      />

      {/* 轻量刷新与操作 Toast 提示 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#222225] border border-blue-500/40 text-blue-300 px-4 py-2 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
