# OpenSCENARIO 验证工具 - 前端

这是一个用于验证 OpenSCENARIO 文件的 Web 前端应用，基于 React 和 TypeScript 构建。

## 功能特点

- 拖放上传 OpenSCENARIO (.xosc) 文件
- 实时验证反馈
- 显示详细的验证结果，包括错误和警告
- 响应式设计，适配桌面和移动设备

## 技术栈

- [Vite](https://vitejs.dev/) - 前端构建工具
- [React](https://reactjs.org/) - JavaScript 库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript 超集
- [shadcn/ui](https://ui.shadcn.com/) - 可定制的 UI 组件
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Axios](https://axios-http.com/) - HTTP 客户端

## 快速开始

### 先决条件

- Node.js 16+ 和 npm 8+
- 后端 API 服务（参见后端 README）

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env` 文件并添加以下内容：

```env
VITE_API_URL=http://localhost:8080
```

### 开发模式

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 可用

### 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist` 目录中

## 项目结构

```
.
├── public/              # 静态文件
├── src/
│   ├── assets/         # 图片等资源
│   ├── components/      # 可复用组件
│   ├── pages/           # 页面组件
│   ├── services/        # API 服务
│   ├── styles/          # 全局样式
│   ├── types/           # TypeScript 类型定义
│   ├── App.tsx          # 主应用组件
│   └── main.tsx         # 应用入口
├── .env                 # 环境变量
├── index.html           # HTML 模板
└── vite.config.ts       # Vite 配置
```

## 开发指南

### 添加新组件

使用以下命令添加新的 shadcn/ui 组件：

```bash
npx shadcn-ui@latest add <component-name>
```

### 代码风格

我们使用以下工具保持代码风格一致：

- [ESLint](https://eslint.org/) - JavaScript/TypeScript 代码检查
- [Prettier](https://prettier.io/) - 代码格式化

运行以下命令检查和修复代码：

```bash
# 检查代码
npm run lint

# 修复可自动修复的问题
npm run lint:fix

# 格式化代码
npm run format
```

## 测试

### 单元测试

```bash
npm test
```

### 组件测试

我们使用 [Vitest](https://vitest.dev/) 和 [Testing Library](https://testing-library.com/) 进行组件测试。

## 部署

### 使用 Docker

构建 Docker 镜像：

```bash
docker build -t openscenario-frontend .
```

运行容器：

```bash
docker run -d \
  --name openscenario-frontend \
  -p 3000:80 \
  -e VITE_API_URL=/api \
  --network=host \
  openscenario-frontend
```

### 使用 Nginx

构建生产版本后，可以将 `dist` 目录部署到任何静态文件服务器或 CDN。

## 贡献

欢迎提交 Issue 和 Pull Request。请确保：

1. 编写清晰的提交信息
2. 更新相关文档
3. 添加适当的测试

## 许可证

[在这里添加许可证信息]
