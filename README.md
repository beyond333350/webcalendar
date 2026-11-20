# WebCalendar

基于 Obsidian Full Calendar 风格的高颜值深色 Web 端日历与待办应用，支持月视图天气展示、近 3 天快捷待办、Radicale CalDAV 同步设置与 1Panel / Docker 一键容器化部署。

---

## ✨ 功能特性

- **Obsidian 沉浸式暗黑风格**：复刻 Obsidian 经典深色调 (`#18181b` 背景、`#222225` 卡片、`#27272a` 边框)，配以粉红、亮蓝、橙色、青绿等鲜艳胶囊药丸标签。
- **近 3 天日程待办栏**：左侧专栏即时展现 Today、Tomorrow、Day After Tomorrow 安排，支持待办一键勾选完成。
- **月视图天气指示**：日历矩阵每个日期格子内嵌实时天气图标（晴、云、雨、雪），直观掌握近期出行气象。
- **全方位增删改查**：右侧抽屉式详情面板快速展开任意日期事项，支持编辑、删除及表单弹窗新建。
- **CalDAV 双向同步设置**：内置 Radicale CalDAV 兼容配置界面，支持分别配置独立日历日程集合 URL（VEVENT）与待办任务集合 URL（VTODO），提供连接测试与自动同步支持。
- **用户鉴权与设置**：基于 JWT + bcrypt + SQLite 的用户账户系统，支持独立注册登录与密码修改。
- **开箱即用与容器化**：多阶段轻量化 Docker 镜像，支持 1Panel 编排一键拉起与数据持久化。

---

## 🛠️ 技术栈

- **前端**：React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + date-fns
- **后端**：Node.js / Express + better-sqlite3 + JWT + bcryptjs
- **存储**：SQLite (轻量无外部依赖，通过 Volume 持久化)
- **部署**：Docker / Docker Compose / 1Panel

---

## 🚀 本地开发指南

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发环境
```bash
npm run dev
```
- 前端运行在 `http://localhost:5173`
- 后端 API 运行在 `http://localhost:3000`

### 3. 构建生产包
```bash
npm run build
npm start
```

---

## 🐳 Docker 与 1Panel 部署指引

### 使用 Docker Compose 启动
在项目根目录下直接运行：
```bash
docker compose up -d
```
服务将在宿主机 `3000` 端口启动，数据持久化保存在 Docker 卷 `webcalendar_data` 中。

### 1Panel 面板一键部署
1. 打开 1Panel 控制台，进入 **【容器】** -> **【编排】**。
2. 点击 **【创建编排】**，编排名称填写 `webcalendar`。
3. 复制本项目根目录的 `docker-compose.yml` 内容并粘贴。
4. 确认端口映射（默认 `3000:3000`）及存储卷挂载。
5. 点击 **【启动】**，完成后在浏览器中访问 `http://<服务器IP>:3000` 即可使用。

---

## 📄 开源许可
MIT License
