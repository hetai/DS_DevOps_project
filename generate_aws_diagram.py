#!/usr/bin/env python3
"""
Generate AWS architecture diagram for the OpenSCENARIO project.
Requires: pip install diagrams
"""
from diagrams import Diagram, Cluster
from diagrams.aws.network import CloudFront, ELB
from diagrams.aws.compute import ECS, Fargate
from diagrams.aws.database import RDS
from diagrams.aws.storage import S3
from diagrams.aws.integration import SQS
from diagrams.aws.security import IAM

with Diagram("OpenSCENARIO AWS Architecture", show=False, direction="TB", filename="docs/aws_architecture"):
    # Edge services
    cf = CloudFront("CloudFront")
    alb = ELB("Application\nLoad Balancer")
    
    with Cluster("VPC"):
        # Compute
        frontend = Fargate("Frontend\n(Nginx + React)")
        backend = Fargate("Backend\n(FastAPI)")
        
        # Data layer
        rds = RDS("PostgreSQL\nMulti-AZ")
    
    # Storage
    s3 = S3("S3 Bucket\nStatic Assets")
    
    # DevOps
    ecr = S3("ECR\nDocker Images")
    
    # IAM
    iam = IAM("IAM Roles")
    
    # Connections
    cf >> alb
    alb >> frontend
    alb >> backend
    backend >> rds
    frontend - s3
    ecr >> frontend
    ecr >> backend
    iam - [frontend, backend, rds]
