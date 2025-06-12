# Development Guide / 开发指南

This guide provides instructions for setting up a local development environment and the development workflow for the OpenSCENARIO Validation Tool.

本文档提供了 OpenSCENARIO 验证工具的本地开发环境设置和开发工作流程说明。

## Table of Contents / 目录

- [Prerequisites / 先决条件](#prerequisites--先决条件)
- [Local Development Setup / 本地开发环境设置](#local-development-setup--本地开发环境设置)
  - [Using Docker (Recommended) / 使用 Docker（推荐）](#using-docker-recommended--使用-docker推荐)
  - [Without Docker / 不使用 Docker](#without-docker--不使用-docker)
- [Development Workflow / 开发工作流程](#development-workflow--开发工作流程)
- [Code Style & Quality / 代码风格与质量](#code-style--quality--代码风格与质量)
- [Testing / 测试](#testing--测试)
- [Debugging / 调试](#debugging--调试)
- [Submitting Code / 提交代码](#submitting-code--提交代码)
- [Validator Integration / 验证器集成](#validator-integration--验证器集成)

## Prerequisites / 先决条件

- Git
- Node.js 16+ and npm 8+ (for frontend development) / Node.js 16+ 和 npm 8+（前端开发）
- Python 3.8+ (for backend development) / Python 3.8+（后端开发）
- Docker and Docker Compose (recommended) / Docker 和 Docker Compose（推荐）
- (Optional) OpenSCENARIO validator executable for local development / （可选）本地开发用的 OpenSCENARIO 验证器可执行文件

## Local Development Setup / 本地开发环境设置

### Using Docker (Recommended) / 使用 Docker（推荐）

1. **Clone the repository** / **克隆仓库**

   ```bash
   git clone <repository-url>
   cd DS_DevOps_project
   ```

2. **Start the development environment** / **启动开发环境**

   The Docker setup now includes the OpenSCENARIO validator by default. If you need to use a custom validator, you can either:
   
   Docker 设置现在默认包含 OpenSCENARIO 验证器。如果您需要使用自定义验证器，您可以：
   
   **Option 1: Use the build script** / **选项1：使用构建脚本**
   
   ```bash
   # Make the build script executable / 使构建脚本可执行
   chmod +x build-with-validator.sh
   
   # Build with your custom validator / 使用自定义验证器构建
   ./build-with-validator.sh --validator /path/to/validator/directory
   ```
   
   **Option 2: Mount validator files** / **选项2：挂载验证器文件**
   
   Alternatively, you can mount your validator files when starting the development environment:
   或者，您可以在启动开发环境时挂载验证器文件：
   
   ```bash
   # Create directory for validator files / 创建验证器文件目录
   mkdir -p data/validator
   
   # Copy your validator files / 复制验证器文件
   cp /path/to/OpenSCENARIOValidator data/validator/
   cp /path/to/*.so data/validator/ 2>/dev/null || :
   
   # Start the development environment / 启动开发环境
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

3. **Access the application** / **访问应用**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

4. **Access the application** / **访问应用**

   - Frontend / 前端: http://localhost:3000
   - Backend API / 后端 API: http://localhost:8080
   - API Documentation / API 文档: http://localhost:8080/docs

5. **View logs** / **查看日志**

   ```bash
   # View all container logs / 查看所有容器日志
   docker-compose -f docker-compose.dev.yml logs -f
   
   # View frontend logs / 查看前端日志
   docker-compose -f docker-compose.dev.yml logs -f frontend
   
   # View backend logs / 查看后端日志
   docker-compose -f docker-compose.dev.yml logs -f backend
   ```

### Without Docker / 不使用 Docker

#### Backend Setup / 后端设置

1. **Clone the repository** / **克隆仓库**

   ```bash
   git clone <repository-url>
   cd DS_DevOps_project/app/backend/openscenario-api-service
   ```

2. **Create and activate a virtual environment** / **创建并激活虚拟环境**

   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # 或
   # venv\Scripts\activate  # Windows
   ```

3. **Install dependencies** / **安装依赖**

   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. **Set environment variables** / **设置环境变量**

   ```bash
   export VALIDATOR_PATH=/path/to/OpenSCENARIOValidator
   export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname $VALIDATOR_PATH)/..
   export PORT=8080
   export LOG_LEVEL=DEBUG
   ```

5. **Start the development server** / **启动开发服务器**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8080
   ```

#### Frontend Setup / 前端设置

1. **Navigate to the frontend directory** / **进入前端目录**

   ```bash
   cd ../../frontend/scenario-tool-suite
   ```

2. **Install dependencies** / **安装依赖**

   ```bash
   npm install
   ```

3. **Start the development server** / **启动开发服务器**

   ```bash
   npm run dev
   ```

4. **Access the application** / **访问应用**

   - Frontend / 前端: http://localhost:3000
   - Backend API / 后端 API: http://localhost:8080

## Development Workflow / 开发工作流程

1. **Create a feature branch** / **创建功能分支**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop your feature** / **开发功能**
   - Write code / 编写代码
   - Add tests / 添加测试
   - Update documentation / 更新文档

3. **Run tests** / **运行测试**

   ```bash
   # Backend tests / 后端测试
   cd app/backend/openscenario-api-service
   pytest
   
   # Frontend tests / 前端测试
   cd ../../../frontend/scenario-tool-suite
   npm test
   ```

4. **Commit your changes** / **提交更改**

   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** / **创建 Pull Request**
   - Create a Pull Request on GitHub / 在 GitHub 上创建 Pull Request
   - Wait for code review / 等待代码审查
   - Address review comments / 解决审查意见
   - Merge to main branch / 合并到 main 分支

## Code Style & Quality / 代码风格与质量

### Backend / 后端

We use the following tools to maintain code quality and consistency:
我们使用以下工具来保持代码质量和一致性：

- **Black** - Code formatting / 代码格式化
- **isort** - Import sorting / 导入排序
- **Flake8** - Code style checking / 代码风格检查
- **mypy** - Static type checking / 静态类型检查

Run code checks and formatting:
运行代码检查和格式化：

```bash
# Format code / 格式化代码
black .
isort .

# Check code style / 检查代码风格
flake8 .

# Type checking / 类型检查
mypy .
```

### Frontend / 前端

We use the following tools to maintain code quality and consistency:
我们使用以下工具来保持代码质量和一致性：

- **ESLint** - JavaScript/TypeScript linting / JavaScript/TypeScript 代码检查
- **Prettier** - Code formatting / 代码格式化
- **TypeScript** - Type checking / 类型检查

Run code checks and formatting:
运行代码检查和格式化：

```bash
# Check code / 检查代码
npm run lint

# Fix auto-fixable issues / 修复可自动修复的问题
npm run lint:fix

# Format code / 格式化代码
npm run format

# Type checking / 类型检查
npm run type-check
```

## Testing / 测试

### Backend Tests / 后端测试

```bash
cd app/backend/openscenario-api-service
pytest
```

### Frontend Tests / 前端测试

```bash
cd frontend/scenario-tool-suite

# Run unit tests / 运行单元测试
npm test

# Run component tests / 运行组件测试
npm run test:unit

# Run end-to-end tests / 运行端到端测试
npm run test:e2e
```

## Debugging / 调试

### Backend Debugging / 后端调试

Use VS Code's debugging configuration or add `import pdb; pdb.set_trace()` for debugging.

使用 VS Code 的调试配置，或添加 `import pdb; pdb.set_trace()` 进行调试。

### Frontend Debugging / 前端调试

Use Chrome DevTools or VS Code's debugging features.

使用 Chrome DevTools 或 VS Code 的调试功能。

## Submitting Code / 提交代码

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范提交信息。

Commit message format:
提交信息格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Commit types:
提交类型：

- `feat`: A new feature / 新功能
- `fix`: A bug fix / 修复 bug
- `docs`: Documentation only changes / 仅文档更新
- `style`: Changes that do not affect the meaning of the code / 代码格式（不影响代码运行的变动）
- `refactor`: A code change that neither fixes a bug nor adds a feature / 重构（既不增加新功能，也不是修复 bug）
- `perf`: A code change that improves performance / 性能优化
- `test`: Adding missing tests or correcting existing tests / 增加测试
- `chore`: Changes to the build process or auxiliary tools / 构建过程或辅助工具的变动

Example / 示例：

```
feat: add user authentication

- Add JWT authentication
- Add login/logout endpoints
- Add user model and migrations

Closes #123
```

## AWS Deployment / AWS 部署

### ECS Deployment / ECS 部署

The application is deployed on AWS using ECS (Elastic Container Service) with Fargate. The deployment includes:

- Frontend container running Nginx serving static files
- Backend container running FastAPI
- ALB (Application Load Balancer) for routing traffic

应用程序使用 AWS ECS（Elastic Container Service）和 Fargate 进行部署。部署包括：

- 运行 Nginx 服务静态文件的前端容器
- 运行 FastAPI 的后端容器
- 用于路由流量的 ALB（应用负载均衡器）

### Docker Image Management / Docker 镜像管理

Docker images are stored in ECR (Elastic Container Registry):

```bash
# Build and push frontend image
cd app/frontend/scenario-tool-suite
docker build -t <account-id>.dkr.ecr.<region>.amazonaws.com/dev-frontend:latest -f docker/nginx/Dockerfile .
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/dev-frontend:latest

# Build and push backend image
cd app/backend/openscenario-api-service
docker build -t <account-id>.dkr.ecr.<region>.amazonaws.com/dev-backend:latest .
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/dev-backend:latest
```

Docker 镜像存储在 ECR（Elastic Container Registry）中：

```bash
# 构建并推送前端镜像
cd app/frontend/scenario-tool-suite
docker build -t <account-id>.dkr.ecr.<region>.amazonaws.com/dev-frontend:latest -f docker/nginx/Dockerfile .
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/dev-frontend:latest

# 构建并推送后端镜像
cd app/backend/openscenario-api-service
docker build -t <account-id>.dkr.ecr.<region>.amazonaws.com/dev-backend:latest .
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/dev-backend:latest
```

### Troubleshooting / 故障排除

For common AWS deployment issues and their solutions, refer to the [AWS Troubleshooting Guide](aws_troubleshooting.md).

有关常见 AWS 部署问题及其解决方案，请参阅 [AWS 故障排除指南](aws_troubleshooting.md)。

Key considerations for ECS deployments:

1. **Service Discovery**: Use ALB DNS names for service-to-service communication in ECS Fargate
2. **Container Health Checks**: Implement proper health checks in task definitions
3. **CloudWatch Logs**: Monitor container logs for startup and runtime issues

ECS 部署的关键考虑因素：

1. **服务发现**：在 ECS Fargate 中使用 ALB DNS 名称进行服务间通信
2. **容器健康检查**：在任务定义中实现适当的健康检查
3. **CloudWatch 日志**：监控容器日志以发现启动和运行时问题
