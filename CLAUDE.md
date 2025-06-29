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

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

### Backend Development

```bash
cd app/backend/openscenario-api-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Install test dependencies
pip install -r requirements-test.txt

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8080

# Run unit tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_workflow_service.py

# Run tests with verbose output
pytest -v
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
- **Backend**: FastAPI application with OpenSCENARIO validation capabilities and integrated workflow management
- **Infrastructure**: Terraform modules for AWS ECS, RDS, ECR, and networking
- **Deployment**: Docker containers with Nginx reverse proxy, Ansible playbooks for configuration management
- **Testing**: Comprehensive test suite with Vitest (frontend), pytest (backend), and Playwright (E2E)

### Key Components

- **Frontend Service**: Containerized React app served by Nginx with 3D visualization capabilities
- **Backend Service**: FastAPI application with workflow orchestration, file validation, and AI integration
- **Workflow Manager**: Centralized orchestrator for multi-step scenario operations (generation → validation → visualization)
- **3D Visualization**: Three.js-based components for OpenDRIVE/OpenSCENARIO rendering
- **OpenSCENARIO Validator**: C++ executable integrated into backend for validation
- **Database**: PostgreSQL for persistent storage (configured but not actively used in current implementation)
- **Load Balancer**: Application Load Balancer routing traffic between services

### Service Communication

- Frontend communicates with backend via REST API at `/api` endpoints
- Backend provides health check endpoint at `/health`
- File validation handled through `/api/validate` and `/api/validate-pair` endpoints
- Integrated workflow endpoints:
  - `/api/workflow/complete` - Full generation → validation → visualization workflow
  - `/api/workflow/generate-and-validate` - Generation and validation workflow
  - `/api/workflow/{session_id}/status` - Workflow status polling
  - `/api/workflow/{session_id}/files` - Retrieve generated files
  - `/api/workflow/{session_id}/validation` - Retrieve validation results

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
  - `src/components/workflow/`: Integrated workflow management components
  - `src/components/visualization/`: 3D visualization components (Three.js)
  - `src/test/`: Frontend test suites (Vitest)
  - `e2e/`: End-to-end test suites (Playwright)
- `app/backend/openscenario-api-service/`: FastAPI backend service
  - `app/workflow_service.py`: Workflow orchestration and management
  - `tests/`: Backend test suites (pytest)
- `terraform/`: Infrastructure as Code using Terraform modules
- `ansible/`: Configuration management and deployment automation
- `docker-compose.*.yml`: Container orchestration files for different environments
- `docs/`: Project documentation including PRD and architecture diagrams

## Development Notes

- The project uses a microservices architecture with separate frontend and backend services
- OpenSCENARIO validator is a C++ executable that must be available in the backend container
- Frontend uses React Router for navigation, React Query for API state management, and Three.js for 3D visualization
- Backend includes comprehensive workflow orchestration with status tracking and file management
- Integrated workflow system provides seamless generation → validation → visualization pipeline
- Terraform modules are organized by service (networking, ecr, rds, ecs_service, etc.)
- Ansible playbooks handle server configuration and service deployment
- Comprehensive testing infrastructure with unit tests, integration tests, and E2E tests

## Ports

- Frontend (development): 3000
- Frontend (production): 8081
- Backend: 8080
- Traefik (when used): 8008, 8081

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: React Testing Library for component interaction testing
- **E2E Tests**: Playwright for full application workflow testing
- **Test Coverage**: Comprehensive coverage of workflow components and 3D visualization

### Backend Testing
- **Unit Tests**: pytest for service and utility testing
- **Integration Tests**: FastAPI test client for endpoint testing
- **Test Coverage**: Workflow orchestration, validation services, and AI integration

### Test Commands
```bash
# Frontend tests
npm run test              # Run all unit tests
npm run test:watch        # Watch mode for development
npm run test:e2e          # End-to-end tests

# Backend tests
pytest                    # Run all tests
pytest --cov=app          # With coverage
pytest -v                 # Verbose output
```

## Leveraging Gemini
- Large Codebase Analysis : Using gemini -p "analyze this codebase structure" to get comprehensive overviews
- Architecture Understanding : Leveraging Gemini's ability to process large amounts of code context
- Pattern Recognition : Identifying common patterns and conventions across the project