
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenSCENARIO](https://img.shields.io/badge/OpenSCENARIO-1.0--1.3-brightgreen)](https://www.asam.net/standards/detail/openscenario/)

A web-based tool for validating OpenSCENARIO (.xosc) files with a user-friendly interface.

一个用于验证 OpenSCENARIO (.xosc) 文件的 Web 工具，提供用户友好的界面。

## Table of Contents / 目录

- [Features / 功能特点](#features--功能特点)
- [Screenshots / 截图](#screenshots--截图)
- [Quick Start / 快速开始](#quick-start--快速开始)
  - [Prerequisites / 先决条件](#prerequisites--先决条件)
  - [Using Docker (Recommended) / 使用 Docker（推荐）](#using-docker-recommended--使用-docker推荐)
  - [Local Development / 本地开发](#local-development--本地开发)
- [Project Structure / 项目结构](#project-structure--项目结构)
- [API Documentation / API 文档](#api-documentation--api-文档)
- [Deployment / 部署](#deployment--部署)
- [Contributing / 贡献](#contributing--贡献)
- [License / 许可证](#license--许可证)

## Features / 功能特点

- **File Upload & Validation** / **文件上传与验证**
  - Drag and drop interface for uploading OpenSCENARIO files / 拖放上传 OpenSCENARIO 文件
  - Real-time validation feedback / 实时验证反馈
  - Detailed error and warning messages / 详细的错误和警告信息

- **User Interface** / **用户界面**
  - Responsive design for desktop and mobile / 响应式设计，支持桌面和移动设备
  - Dark/light mode support / 深色/浅色模式支持
  - Intuitive result visualization / 直观的结果可视化

- **Integration** / **集成**
  - RESTful API for programmatic access / 提供 RESTful API 用于编程访问
  - Containerized deployment with Docker / 支持 Docker 容器化部署
  - CI/CD ready / 支持持续集成/持续部署

## Quick Start / 快速开始

### Prerequisites / 先决条件

- Docker 20.10+ and Docker Compose 1.29+
- Node.js 16+ and npm 8+ (for development)
- Python 3.8+ (for backend development)
- OpenSCENARIO validator executable

- Docker 20.10+ 和 Docker Compose 1.29+
- Node.js 16+ 和 npm 8+（用于开发）
- Python 3.8+（用于后端开发）
- OpenSCENARIO 验证器可执行文件

### Using Docker (Recommended) / 使用 Docker（推荐）

```bash
# Clone the repository / 克隆仓库
git clone <repository-url>
cd DS_DevOps_project

# Start the application / 启动应用
docker-compose -f docker-compose.prod.yml up -d --build
```

> **Note on Validator Integration** / **验证器集成说明**
> 
> The OpenSCENARIO validator is now included in the Docker image by default. 
> The validator executable and its required libraries are automatically copied during the build process.
> 
> OpenSCENARIO 验证器现在默认包含在 Docker 镜像中。
> 验证器可执行文件及其所需的库在构建过程中会自动复制。

The production application will be available at:
- Frontend: http://localhost:8081
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

生产环境应用将在以下地址可用：
- 前端: http://localhost:8081
- 后端 API: http://localhost:8080
- API 文档: http://localhost:8080/docs

> **Note**: In production, the frontend is served on port 8081 to avoid conflicts with other services. In development, the frontend runs on port 3000.
> **注意**：生产环境中前端服务运行在 8081 端口以避免与其他服务冲突。开发环境中前端运行在 3000 端口。

### Local Development / 本地开发

#### Using Docker Compose (Recommended) / 使用 Docker Compose（推荐）

```bash
# Start development environment / 启动开发环境
docker-compose -f docker-compose.dev.yml up -d --build

# View logs / 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# Stop services / 停止服务
docker-compose -f docker-compose.dev.yml down
```

Development URLs (when using Docker Compose) / 开发环境地址（使用 Docker Compose 时）:
- Frontend: http://localhost:3000 (development server with hot-reload)
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

> **Note**: The frontend development server runs on port 3000 by default. The backend API is always on port 8080.
> **注意**：前端开发服务器默认运行在 3000 端口，而后端 API 始终运行在 8080 端口。

#### Manual Setup / 手动设置

##### Backend / 后端

```bash
cd app/backend/openscenario-api-service

# Create and activate virtual environment / 创建并激活虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# Install dependencies / 安装依赖
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set environment variables / 设置环境变量
export VALIDATOR_PATH=./validator/OpenSCENARIOValidator
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname $VALIDATOR_PATH)

# Start the development server / 启动开发服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

##### Frontend / 前端

```bash
cd app/frontend/scenario-tool-suite

# Install dependencies / 安装依赖
npm install

# Start the development server / 启动开发服务器
npm run dev
```

The frontend development server will be available at http://localhost:3000

前端开发服务器将在 http://localhost:3000 可用

## Project Structure / 项目结构

```
.
├── app/                           # Application code / 应用代码
│   ├── backend/                   # Backend service / 后端服务
│   │   └── openscenario-api-service/
│   │       ├── main.py           # FastAPI application / FastAPI 应用
│   │       ├── requirements.txt   # Python dependencies / Python 依赖
│   │       └── ...
│   │
│   └── frontend/                # Frontend application / 前端应用
│       └── scenario-tool-suite/
│           ├── src/             # React source code / React 源代码
│           ├── public/           # Static files / 静态文件
│           └── package.json      # Frontend dependencies / 前端依赖
│
├── docker/                      # Docker related files / Docker 相关文件
│   ├── nginx/                    # Nginx configuration / Nginx 配置
│   └── openscenario-validator/   # Validator build files / 验证器构建文件
│
├── docs/                        # Documentation / 文档
│   ├── development.md           # Development guide / 开发指南
│   ├── deployment.md            # Deployment guide / 部署指南
│   └── contributing.md          # Contributing guide / 贡献指南
│
├── docker-compose.dev.yml       # Development environment with hot-reload / 带热重载的开发环境
└── docker-compose.prod.yml      # Production environment / 生产环境
```

## API Documentation / API 文档

### Validate OpenSCENARIO File / 验证 OpenSCENARIO 文件

- **URL**: `/api/validate`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: The OpenSCENARIO file to validate / 要验证的 OpenSCENARIO 文件
- **Response**:
  ```json
  {
    "valid": true,
    "messages": [
      {
        "level": "ERROR",
        "message": "Error message",
        "line": 42,
        "column": 10
      }
    ]
  }
  ```

### Health Check / 健康检查

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

For more details, visit the interactive API documentation at `/docs` when the backend is running.

更多详情，请在后端运行时访问 `/docs` 查看交互式 API 文档。

## Documentation / 文档

For more detailed documentation, please refer to the following files in the `docs` directory:

有关更详细的文档，请参阅 `docs` 目录中的以下文件：

- [Development Guide](docs/development.md) / [开发指南](docs/development.md)
## Deployment / 部署

### Production Deployment / 生产环境部署

1. **Using Docker Compose** / **使用 Docker Compose**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Kubernetes**

   See [deployment guide](docs/deployment.md#kubernetes-deployment) for Kubernetes deployment instructions.
   请参阅[部署指南](docs/deployment_zh.md#kubernetes-部署)了解 Kubernetes 部署说明。

### Environment Variables / 环境变量

#### Backend / 后端

| Variable / 变量名 | Default / 默认值 | Description / 描述 |
|-----------------|----------------|-------------------|
| `VALIDATOR_PATH` | - | Path to OpenSCENARIO validator executable / OpenSCENARIO 验证器可执行文件路径 |
| `LD_LIBRARY_PATH` | - | Library path for shared libraries / 共享库路径 |
| `PORT` | `8080` | Port to run the backend service / 后端服务端口 |
| `LOG_LEVEL` | `INFO` | Logging level / 日志级别 |
| `MAX_UPLOAD_SIZE` | `10485760` | Maximum upload file size in bytes / 最大上传文件大小（字节） |

#### Frontend / 前端

| Variable / 变量名 | Default / 默认值 | Description / 描述 |
|-----------------|----------------|-------------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API URL / 后端 API URL |

## Contributing / 贡献

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to learn how you can contribute to this project.

欢迎贡献！请阅读我们的[贡献指南](CONTRIBUTING_zh.md)了解如何为项目做贡献。

## License / 许可证

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。
