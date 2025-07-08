# 监控系统设置计划

本文档概述了为项目设置完整监控堆栈的步骤。

## 1. 为监控服务创建 Docker Compose

将创建一个新文件 `docker-compose.monitoring.yml`，用于定义和配置所有与监控相关的服务。这确保了与应用程序的 Docker Compose 文件分离。

**将包括的服务：**
- `prometheus`
- `loki`
- `promtail`
- `grafana`
- `tempo`

所有服务都将连接到现有的 `openscenario-network`，以便与 `frontend` 和 `backend` 应用程序通信。

## 2. 配置监控服务

`monitoring/` 中的空配置目录将填充功能性配置文件。

### Prometheus (`monitoring/prometheus/prometheus.yml`)
- 配置一个抓取作业，以从 `backend` 服务收集指标。
- 设置服务发现，以在 `openscenario-network` 上找到 `backend` 容器。

### Promtail (`monitoring/promtail/promtail.yml`)
- 配置 Docker 服务发现，以自动查找并跟踪所有相关容器（例如 `frontend`、`backend`）的日志。
- 为日志添加标签（例如 `container_name`、`job`），以便在 Loki 中轻松过滤。
- 配置目标以将日志发送到 `loki` 服务。

### Loki (`monitoring/loki/loki.yml`)
- 创建一个基本配置，以从 Promtail 接收日志并存储它们。

### Tempo (`monitoring/tempo/tempo.yml`)
- 创建一个基本配置以接收跟踪。
- 为标准格式（例如 OTLP）配置接收器。

### Grafana (`monitoring/grafana/`)
- **数据源 (`monitoring/grafana/provisioning/datasources/datasources.yml`):**
    - 自动将 Prometheus、Loki 和 Tempo 配置为数据源。
- **仪表盘 (`monitoring/grafana/provisioning/dashboards/`):**
    - 为默认仪表盘创建一个占位符，以可视化关键指标和日志。

## 3. 更新项目文档
- 在主 `README.md` 中添加有关如何启动完整堆栈（包括监控服务）的说明（例如 `docker-compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up`）。

该计划将产生一个功能齐全的、容器化的监控堆栈，从而提供对应用程序性能和行为的可见性。