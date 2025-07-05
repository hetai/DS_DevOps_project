[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenSCENARIO](https://img.shields.io/badge/OpenSCENARIO-1.0--1.3-brightgreen)](https://www.asam.net/standards/detail/openscenario/)
[![Status](https://img.shields.io/badge/Status-Fully%20Operational-success)]()
[![AI](https://img.shields.io/badge/AI-GPT--4%20Powered-blue)]()
[![Workflow](https://img.shields.io/badge/Workflow-One--Click-green)]()

# 🤖 AI-Enhanced ASAM OpenX Scenario Generation System

A complete AI-powered platform for creating, validating, and visualizing ASAM OpenSCENARIO and OpenDRIVE files through natural language conversations and automated workflows.

## 🚀 System Status: FULLY OPERATIONAL

**Latest Update (July 4, 2025)**: All core features are now fully deployed and operational!

### ✅ Working Features
- 🤖 **Multi-turn AI Chatbot** - Natural language scenario generation
- 🎯 **One-Click Workflow** - Complete generation → validation → visualization
- 📁 **Automatic File Generation** - OpenSCENARIO (.xosc) + OpenDRIVE (.xodr)
- ✔️ **Real-time Validation** - ASAM compliance checking with zero errors
- 📊 **Live Monitoring** - Grafana dashboard with system metrics
- 🔄 **End-to-End Integration** - Seamless frontend ↔ backend communication

## 🌐 Quick Access

### User Interfaces
- **🎨 Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **📊 Grafana Monitoring**: [http://localhost:3001](http://localhost:3001)
- **🔧 Backend API**: [http://localhost:8080](http://localhost:8080)

### Navigation
- **Scenario Generator** ← 🎯 **Main feature with AI chatbot and one-click workflow**
- **Scenario Player** ← Basic scenario playback
- **Scenario Validator** ← File validation interface
- **Integrated Workflow** ← Advanced workflow management

## Table of Contents

- [🎯 Core Features](#-core-features)
- [🚀 Quick Start](#-quick-start)
- [💻 Usage Guide](#-usage-guide)
- [🏗️ Architecture](#️-architecture)
- [📚 Documentation](#-documentation)
- [🔧 Development](#-development)
- [📈 Monitoring](#-monitoring)

## 🎯 Core Features

### 🤖 AI-Powered Scenario Generation
- **Multi-turn Conversations**: Natural language dialogue with AI assistant
- **Smart Parameter Extraction**: Automatic scenario parameter detection
- **NCAP Compliance**: Euro NCAP test protocol integration
- **Real-time Guidance**: Interactive scenario refinement

### 🎯 One-Click Workflow
- **Complete Automation**: Generation → Validation → Visualization preparation
- **File Management**: Automatic OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) creation
- **Real-time Status**: Live progress tracking and status updates
- **Zero Manual Steps**: Eliminate upload/download/conversion workflows

### ✔️ Advanced Validation
- **ASAM Compliance**: OpenSCENARIO and OpenDRIVE standard validation
- **Cross-file Validation**: Consistency checking between .xosc and .xodr files
- **Detailed Reporting**: Line-by-line error and warning information
- **Multiple Validation Levels**: Schema, enhanced, and domain-specific checks

### 🎨 Modern User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live status and progress indicators
- **User-friendly**: Clear instructions and visual feedback
- **No Complex Dependencies**: Streamlined interface that just works

### 🔧 Integration & Deployment
- **RESTful API**: Complete programmatic access
- **Docker Containerized**: Ready-to-deploy containers
- **Real-time Monitoring**: Grafana dashboards and metrics
- **Production Ready**: Fully tested and operational

## 🚀 Quick Start

### 🔧 Prerequisites

- Docker 20.10+ and Docker Compose 1.29+
- OpenAI API Key (for AI functionality)

### ⚡ Start the System (2 Commands)

```bash
# 1. Clone and navigate
git clone <repository-url>
cd DS_DevOps_project

# 2. Set OpenAI API key and start
echo "OPENAI_API_KEY=your-api-key-here" > .env
docker-compose -f docker-compose.dev.yml up -d --build
```

### 🌐 Access the Application

The system will be available at:
- **🎨 Frontend**: [http://localhost:3000](http://localhost:3000) ← **Main interface**
- **📊 Monitoring**: [http://localhost:3001](http://localhost:3001) ← **Grafana dashboard**
- **🔧 Backend API**: [http://localhost:8080](http://localhost:8080) ← **API endpoints**
- **📚 API Docs**: [http://localhost:8080/docs](http://localhost:8080/docs) ← **Swagger UI**

## 💻 Usage Guide

### 🎯 Quick Workflow

1. **Open Frontend**: Navigate to http://localhost:3000
2. **Go to Scenario Generator**: Click "Scenario Generator" in navigation
3. **Chat with AI**: Describe your scenario in natural language
4. **Execute Workflow**: Click "🎯 Generate + Validate + Visualize" button
5. **Monitor Progress**: Watch real-time status updates
6. **Download Files**: Access generated OpenSCENARIO and OpenDRIVE files

### 🤖 AI Chat Features

- **Multi-turn Conversations**: Continuous dialogue, not one-shot input
- **Natural Language**: Describe scenarios in plain English
- **Smart Guidance**: AI helps refine and complete scenario details
- **Parameter Extraction**: Automatic detection of scenario parameters

### 🎯 One-Click Workflow Features

- **Complete Automation**: No manual file handling required
- **Real-time Feedback**: Live progress and status updates
- **Error Handling**: Clear error messages and recovery guidance
- **File Generation**: Automatic creation of ASAM-compliant files

### Local Development

#### Using Docker Compose (Recommended)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

Development URLs (when using Docker Compose):
- Frontend: http://localhost:3000 (development server with hot-reload)
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

> **Note**: The frontend development server runs on port 3000 by default. The backend API is always on port 8080.

#### Manual Setup

##### Backend

```bash
cd app/backend/openscenario-api-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Set environment variables
export VALIDATOR_PATH=./validator/OpenSCENARIOValidator
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$(dirname $VALIDATOR_PATH)

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

##### Frontend

```bash
cd app/frontend/scenario-tool-suite

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend development server will be available at http://localhost:3000

## Project Structure

```
.
├── app/
│   ├── backend/
│   │   └── openscenario-api-service/
│   └── frontend/
│       └── scenario-tool-suite/
│           ├── src/
│           ├── public/
│           └── package.json
├── ansible/
├── docker/
│   ├── nginx/
│   └── openscenario-validator/
├── docs/
├── terraform/                 # Infrastructure as code
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Dockerfile
└── README.md
```

## AWS Architecture Diagram
Below is the current AWS architecture for the OpenSCENARIO deployment:

![AWS Architecture](docs/aws_architecture.png)

### Components:

- **CloudFront**: CDN for global content delivery
- **Application Load Balancer**: Routes traffic to frontend and backend services
- **Frontend Service**: Containerized React application with Nginx
- **Backend Service**: FastAPI service handling API requests
- **RDS PostgreSQL**: Multi-AZ database for persistent storage
- **S3 Bucket**: Stores static assets and user uploads
- **ECR**: Docker image repository for container images
- **IAM**: Security roles and permissions

### Network Flow:
1. Users access the application via CloudFront
2. Requests are routed through the ALB
3. ALB forwards requests to the appropriate ECS services
4. Backend service communicates with RDS for data persistence

## API Documentation

### Validate OpenSCENARIO File

- **URL**: `/api/validate`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `file`: The OpenSCENARIO file to validate
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

### Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok"
  }
  ```

For more details, visit the interactive API documentation at `/docs` when the backend is running.

## Deployment

### Production Deployment

1. **Using Docker Compose**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Kubernetes**

   See [deployment guide](docs/deployment.md#kubernetes-deployment) for Kubernetes deployment instructions.

3. **AWS ECS (Elastic Container Service)**

   The application can be deployed to AWS ECS with Fargate for serverless container management:
   
   - Frontend and backend services are containerized and deployed as ECS tasks
   - Application Load Balancer (ALB) routes traffic to the services
   - Docker images are stored in Amazon ECR
   - Service-to-service communication via ALB DNS names
   
   **Recent Updates:**
   - Fixed Nginx upstream configuration to use ALB DNS for backend communication
   - Implemented proper container health checks
   - Optimized Docker images for faster startup and smaller size
   
   For detailed AWS deployment instructions and troubleshooting, see the [AWS Deployment Guide](docs/aws_troubleshooting.md).

### Environment Variables

#### Backend

| Variable | Default | Description |
|-----------------|----------------|-------------------|
| `VALIDATOR_PATH` | - | Path to OpenSCENARIO validator executable |
| `LD_LIBRARY_PATH` | - | Library path for shared libraries |
| `PORT` | `8080` | Port to run the backend service |
| `LOG_LEVEL` | `INFO` | Logging level |
| `MAX_UPLOAD_SIZE` | `10485760` | Maximum upload file size in bytes |

#### Frontend

| Variable | Default | Description |
|-----------------|----------------|-------------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API URL |

## 📚 Documentation

### 📋 Project Documentation
- **[Development Status](docs/dev_status.md)** - Complete feature implementation status
- **[Product Requirements](docs/PRD.md)** - Original project requirements and specifications
- **[Deployment Status](docs/DEPLOYMENT_STATUS.md)** - Current deployment state and access info
- **[Changelog](docs/CHANGELOG_2025-07-04.md)** - Latest updates and fixes

### 🔧 Technical Documentation  
- **[Verification Guide](docs/VERIFICATION.md)** - TDD testing and verification procedures
- **[AWS Architecture](docs/aws_troubleshooting.md)** - AWS deployment guide and troubleshooting
- **[Terraform Guide](docs/terraform_guide.md)** - Infrastructure as code documentation
- **[Monitoring Plan](docs/monitoring_plan.md)** - System monitoring and observability

### 📊 Operations Documentation
- **[Monitoring Deployment](docs/monitoring_deployment_summary.md)** - Grafana, Prometheus setup
- **[OKRs](docs/OKR.md)** - Objectives and key results tracking

### 🎯 Quick Links
- **System Status**: ✅ FULLY OPERATIONAL
- **Latest Update**: July 4, 2025
- **Main Features**: AI Chatbot + One-Click Workflow + Real-time Validation
- **Access URLs**: [Frontend](http://localhost:3000) | [Monitoring](http://localhost:3001)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to learn how you can contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
