# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-Enhanced ASAM OpenX Scenario Generation system that provides conversational AI-powered creation and validation of OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files. The system uses Large Language Models (LLM), Retrieval-Augmented Generation (RAG), and scenario generation libraries to create NCAP-compliant scenarios from natural language descriptions.

### Key Features
- **Conversational AI Chatbot**: Natural language scenario description and parameter extraction
- **RAG-Enhanced Generation**: NCAP scenario knowledge base for compliance guidance
- **Automated File Generation**: OpenSCENARIO and OpenDRIVE file creation using pyoscx
- **Validation Pipeline**: ASAM Quality Checker Framework integration (planned)
- **Web-Based Interface**: React frontend with real-time chat and file preview

## Development Commands

### Quick Setup

```bash
# Run setup script (creates directories, checks prerequisites)
./setup_ai_system.sh

# Edit environment variables (add OpenAI API key)
nano .env
```

### Local Development (Docker - Recommended)

```bash
# Start development environment (includes AI services)
docker-compose -f docker-compose.dev.yml up -d --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Required Environment Variables

```bash
# OpenAI API Key (required for AI functionality)
OPENAI_API_KEY=your-api-key-here

# Optional configuration
LOG_LEVEL=INFO
RAG_DATA_DIR=./ncap_data
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### Production Deployment

```bash
# Build and run production environment
docker-compose -f docker-compose.prod.yml up -d --build
```

### Frontend Development

```bash
cd app/frontend/scenario-tool-suite

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Development

```bash
cd app/backend/openscenario-api-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### Infrastructure Commands

```bash
# Terraform deployment
cd terraform
terraform init
terraform plan
terraform apply

# Ansible deployment
cd ansible
ansible-playbook -i inventory/production/hosts.yml playbooks/site.yml
```

## Architecture

### High-Level Structure

- **Frontend**: React + TypeScript application using Vite, Tailwind CSS, and shadcn/ui components
- **Backend**: FastAPI application with OpenSCENARIO validation capabilities
- **Infrastructure**: Terraform modules for AWS ECS, RDS, ECR, and networking
- **Deployment**: Docker containers with Nginx reverse proxy, Ansible playbooks for configuration management

### Key Components

- **Frontend Service**: Containerized React app served by Nginx
- **Backend Service**: FastAPI application handling file validation
- **OpenSCENARIO Validator**: C++ executable integrated into backend for validation
- **Database**: PostgreSQL for persistent storage (configured but not actively used in current implementation)
- **Load Balancer**: Application Load Balancer routing traffic between services

### Service Communication

- Frontend communicates with backend via REST API at `/api` endpoints
- Backend provides health check endpoint at `/health`
- File validation handled through `/api/validate` endpoint

### AWS Deployment Architecture

- **ECS Services**: Frontend and backend deployed as separate ECS services
- **ALB**: Routes traffic to appropriate services based on path
- **ECR**: Stores Docker images for deployment
- **RDS**: PostgreSQL database for data persistence
- **S3 + CloudFront**: Static asset delivery (planned)

## Environment Variables

### Backend
- `VALIDATOR_PATH`: Path to OpenSCENARIO validator executable
- `LD_LIBRARY_PATH`: Library path for validator dependencies
- `PORT`: Backend service port (default: 8080)
- `LOG_LEVEL`: Logging level (INFO, DEBUG, etc.)
- `MAX_UPLOAD_SIZE`: Maximum file upload size in bytes

### Frontend
- `VITE_API_URL`: Backend API URL for frontend to connect to

## File Structure

- `app/frontend/scenario-tool-suite/`: React frontend application
- `app/backend/openscenario-api-service/`: FastAPI backend service
- `terraform/`: Infrastructure as Code using Terraform modules
- `ansible/`: Configuration management and deployment automation
- `docker-compose.*.yml`: Container orchestration files for different environments
- `docs/`: Project documentation including PRD and architecture diagrams

## Development Notes

- The project uses a microservices architecture with separate frontend and backend services
- OpenSCENARIO validator is a C++ executable that must be available in the backend container
- Frontend uses React Router for navigation and React Query for API state management
- Backend is minimal FastAPI application with basic health check and validation endpoints
- Terraform modules are organized by service (networking, ecr, rds, ecs_service, etc.)
- Ansible playbooks handle server configuration and service deployment

## Ports

- Frontend (development): 3000
- Frontend (production): 8081
- Backend: 8080
- Traefik (when used): 8008, 8081