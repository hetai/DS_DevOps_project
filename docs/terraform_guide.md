## Deployment Plan for DS_DevOps_project

This section outlines the plan to deploy the `DS_DevOps_project` to AWS using Terraform. The existing project is a Dockerized application with a frontend, backend, and potentially a database. We will adapt the Terraform configurations to suit this architecture.

### 1. Analyze Existing Project Structure

- **Frontend**: Identify how the frontend (`app/frontend/scenario-tool-suite`) is built and served. This will likely be a static build deployed to S3 and served via CloudFront, or containerized and run on ECS/Fargate.
- **Backend**: The backend (`app/backend/`) consists of Python services and potentially C++ components (`openscenario.api.test`). This will be containerized and deployed on AWS ECS/Fargate.
- **Database**: The project uses `db.py`, implying a database. We need to determine if it's SQLite (for local dev) or needs a managed RDS instance (e.g., PostgreSQL, MySQL) in production.
- **Dockerization**: The project uses Docker (`Dockerfile`, `docker-compose.yml`, etc.). We will leverage these for creating ECR images.
- **Configuration**: Review `app/config.py` for environment-specific settings that need to be managed via Terraform (e.g., database credentials, API keys).

### 2. Define AWS Infrastructure with Terraform

Based on the analysis and the general requirements in this guide, we will define the following AWS resources using Terraform modules:

- **VPC (Networking Module)**:
    - Create a new VPC or use an existing one.
    - Define public and private subnets across multiple Availability Zones (eu-west-3a, eu-west-3b).
    - Set up Internet Gateway, NAT Gateway (if private subnets need outbound internet access).
    - Configure route tables.
    - Security Groups for frontend, backend, and database.

- **ECR (Elastic Container Registry)**:
    - Create ECR repositories for frontend and backend Docker images.

- **ECS/Fargate (Compute)**:
    - **Backend Service**:
        - Create an ECS Cluster.
        - Define an ECS Task Definition for the backend container(s). This will include CPU, memory, port mappings, environment variables, and ECR image URI.
        - Create an ECS Service to run and maintain the desired number of backend tasks, potentially with an Application Load Balancer (ALB) for ingress.
    - **Frontend Service (if containerized)**:
        - Similar setup as the backend if the frontend is also a containerized application.

- **S3 & CloudFront (Frontend - if static)**:
    - **S3 Bucket**: To host static frontend assets (HTML, CSS, JS).
    - **CloudFront Distribution**: To serve frontend content globally with caching and HTTPS.
    - OAI (Origin Access Identity) to restrict direct S3 bucket access.

- **RDS (Database Module)**:
    - Provision an `aws_db_instance` (PostgreSQL 14.18, multi-AZ deployment) for high availability.
    - Configure database parameters (using postgres14 parameter group), security groups, and subnets.
    - Manage database credentials securely through terraform.tfvars.

- **IAM Roles and Policies**:
    - Define necessary IAM roles for ECS tasks, EC2 instances (if any), and other services to securely access AWS resources.

- **(Optional) EBS (Storage Module)**:
    - If any service requires persistent block storage beyond what containers or RDS offer, an EBS volume can be provisioned and attached. For this project, it's less likely to be a primary requirement unless specific stateful data needs to be managed outside the database or container ephemeral storage.

### 3. Terraform Project Structure Adaptation

The existing `Project Structure` section in this document is a good starting point. We will adapt it as follows:

```
├── main.tf                 # Root module: provider configuration, remote backend, module calls
├── variables.tf            # Root module: input variables (e.g., region, environment name)
├── outputs.tf              # Root module: outputs (e.g., ALB DNS, CloudFront URL)
├── terraform.tfvars.example # Example variable values
├── modules/
│   ├── networking/         # VPC, subnets, IGW, NAT GW, SGs, route tables
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── variables.tf
│   ├── ecr/                # ECR repositories
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── variables.tf
│   ├── ecs_service/        # Reusable module for an ECS Fargate service (can be used for frontend/backend)
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── variables.tf
│   ├── s3_cloudfront/      # S3 bucket for static assets and CloudFront distribution
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── variables.tf
│   ├── rds/                # RDS instance
│   │   ├── main.tf
│   │   ├── outputs.tf
│   │   └── variables.tf
│   └── iam/                # IAM roles and policies
│       ├── main.tf
│       ├── outputs.tf
│       └── variables.tf
└── scripts/ 
    └── setup_backend.sh # This script will be used for setting up the backend environment
```

### 4. Implementation Steps

1.  **Setup AWS Provider & Authentication**: Configure the AWS provider in `main.tf` and set up AWS authentication using AWS CLI credentials (~/.aws/credentials).
2.  **Develop Networking Module**: Implement VPC, subnets, etc.
3.  **Develop ECR Module**: Create repositories.
4.  **Build and Push Docker Images**: Manually or via CI/CD, build Docker images for frontend and backend and push them to ECR. The image URIs will be used in ECS task definitions.
5.  **Develop IAM Module**: Define necessary roles.
6.  **Develop ECS Service Module**: Create a generic module for deploying services to ECS/Fargate. Instantiate it for the backend and potentially frontend.
7.  **Develop S3/CloudFront Module (if static frontend)**: Configure S3 and CloudFront.
8.  **Develop RDS Module (if needed)**: Provision the database.
9.  **Integrate Modules in Root `main.tf`**: Call the created modules, passing necessary variables.
10. **Define Variables and Outputs**: Populate `variables.tf` and `outputs.tf` at the root and module levels.
11. **Testing**: `terraform plan` and `terraform apply` in a development/staging AWS account.
12. **WordPress/Application Setup**: The `install_wordpress.sh` script's purpose needs to be re-evaluated. If it's for setting up WordPress, it would run on an EC2 instance. For the current `DS_DevOps_project`, this might involve database schema migrations or initial application setup, potentially run as an ECS task or a script executed after deployment.

### 5. CI/CD Integration (Future Step)

- Integrate Terraform deployment into a CI/CD pipeline (e.g., GitHub Actions, AWS CodePipeline).
- Automate Docker image builds and pushes to ECR on code changes.
- Trigger `terraform apply` automatically after successful builds and tests.

This plan provides a roadmap. Specific details will be refined as each component is developed and integrated.

## Implementation Progress

### Milestone 1: Project Analysis and Initial Setup (Completed)

✅ **Analysis of Existing Project Structure**

After examining the project files, we've identified the following components:

- **Frontend**: React application in `app/frontend/scenario-tool-suite` that will be containerized and deployed to AWS.
- **Backend**: FastAPI service in `app/backend/openscenario-api-service` with additional C++ components that will be containerized.
- **Database**: PostgreSQL database (identified from docker-compose files) that will need an RDS instance.
- **Configuration**: Environment variables in docker-compose files that will need to be managed in Terraform.

✅ **Database Requirements**
- PostgreSQL database is used in development (from docker-compose.yml)
- Database credentials are passed via environment variables
- The application uses the `ormar` ORM with SQLAlchemy

### Milestone 2: Terraform Infrastructure Code Creation (Completed)

✅ **Root Module Setup**
- Created `main.tf` with AWS provider configuration and module references
- Created `variables.tf` with input variables for the root module
- Created `outputs.tf` with output values from the root module
- Created `terraform.tfvars.example` with example variable values

✅ **Networking Module**
- Implemented VPC, public and private subnets across multiple AZs
- Added Internet Gateway and NAT Gateway for outbound internet access
- Configured route tables for public and private subnets
- Created security groups for ALB, ECS, and RDS

✅ **ECR Module**
- Created ECR repositories for Docker images
- Implemented repository policies for ECS access
- Added lifecycle policies to manage image retention

✅ **RDS Module**
- Implemented PostgreSQL 14.18 RDS instance with multi-AZ deployment
- Created DB subnet group and postgres14 parameter group
- Configured security and backup settings

✅ **IAM Module**
- Created ECS task execution role with necessary permissions
- Added ECS task role for container-specific permissions
- Implemented policies for S3 and Secrets Manager access

✅ **ECS Service Module**
- Created ECS cluster for container orchestration
- Implemented Application Load Balancer with HTTP listener (HTTPS disabled due to missing certificate)
- Added target groups and listener rules for frontend and backend services
- Created ECS task definitions with container configurations
- Implemented ECS services with desired count and deployment settings

✅ **S3 and CloudFront Module**
- Created S3 bucket for static frontend assets
- Implemented CloudFront distribution for content delivery
- Added Origin Access Identity for secure S3 access
- Configured cache behaviors for different content types

