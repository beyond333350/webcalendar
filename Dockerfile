# 多阶段构建 Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装构建依赖（better-sqlite3 编译需要 python & make & g++）
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 移除非生产依赖，但完整保留已编译好的生产 native 二进制文件 (better-sqlite3 / bcryptjs)
RUN npm prune --production && npm cache clean --force

# 生产运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

RUN apk add --no-cache sqlite-libs

# 从 builder 直接复制生产 package 配置、编译好的 node_modules 以及 dist 构建产物
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "dist/server.js"]
