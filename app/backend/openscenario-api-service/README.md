# OpenSCENARIO 验证 API 服务

这是一个基于 FastAPI 的 HTTP API 服务，用于验证 OpenSCENARIO (.xosc) 文件。

## 功能特点

- 支持上传和验证 OpenSCENARIO 文件
- 提供详细的验证结果，包括错误和警告信息
- 支持 OpenSCENARIO 1.0 到 1.3 版本
- 容器化部署支持

## 先决条件

- Python 3.8+
- OpenSCENARIO 验证器可执行文件
- Node.js 和 npm（仅前端开发需要）

## 快速开始

### 开发环境

1. 克隆仓库
2. 安装 Python 依赖：
   ```bash
   pip install -r requirements.txt
   ```

3. 设置环境变量：
   ```bash
   export VALIDATOR_PATH=/path/to/OpenSCENARIOValidator
   export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname $VALIDATOR_PATH)/..
   ```

4. 启动服务：
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8080
   ```

服务将在 `http://localhost:8080` 可用

## API 端点

### 验证 OpenSCENARIO 文件

- **URL**: `/api/validate`
- **方法**: `POST`
- **Content-Type**: `multipart/form-data`
- **请求体**:
  - `file`: 要验证的 OpenSCENARIO 文件 (.xosc)
- **响应**:
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

### 健康检查

- **URL**: `/health`
- **方法**: `GET`
- **响应**: `{"status": "ok"}`

## 开发

### 安装开发依赖

```bash
pip install -r requirements-dev.txt
```

### 代码风格

我们使用 `black` 和 `isort` 来保持代码风格一致：

```bash
black .
isort .
```

## 部署

### 使用 Docker Compose（推荐）

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 独立 Docker 容器

构建镜像：

```bash
docker build -t openscenario-api .
```

运行容器：

```bash
docker run -d \
  --name openscenario-api \
  -p 8080:8080 \
  -e VALIDATOR_PATH=/app/OpenScenarioValidator \
  -v /path/to/validator:/app \
  openscenario-api
```

## 配置

可以通过以下环境变量配置服务：

- `VALIDATOR_PATH`: OpenSCENARIO 验证器可执行文件路径
- `PORT`: 服务运行的端口（默认：8080）
- `LOG_LEVEL`: 日志级别（默认：INFO）
- `MAX_UPLOAD_SIZE`: 最大上传文件大小（字节，默认：10MB）

## 测试

运行单元测试：

```bash
pytest
```

## 贡献

欢迎提交 Issue 和 Pull Request。请确保：

1. 编写清晰的提交信息
2. 更新相关文档
3. 添加适当的测试

## 许可证

[在这里添加许可证信息]
