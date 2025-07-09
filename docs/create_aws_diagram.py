#!/usr/bin/env python3
"""
Create AWS architecture diagram with clear subnet boundaries and service relationships
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import ECS, ECR, EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import VPC, InternetGateway, NATGateway, ALB, Route53, CloudFront
from diagrams.aws.storage import S3
from diagrams.aws.security import ACM, SecretsManager
from diagrams.aws.management import Cloudwatch
from diagrams.aws.database import Dynamodb
from diagrams.aws.general import General

# Set diagram attributes
graph_attr = {
    "fontsize": "32",
    "bgcolor": "white",
    "margin": "20",
    "pad": "1.5",
    "splines": "ortho",
    "nodesep": "1.2",
    "ranksep": "1.2",
    "fontname": "Sans-Serif",
    "fontcolor": "#2D3436",
    "fontsize": "24",
}

# Edge styles
edge_config = {
    "color": "#666666",
    "style": "solid",
    "fontsize": "12",
}

# Create the diagram
with Diagram("DS DevOps AWS Architecture", filename="aws_architecture", show=False, graph_attr=graph_attr):
    
    # External components
    route53 = Route53("Route 53")
    
    # Create VPC
    with Cluster("VPC"):
        # Internet Gateway
        igw = InternetGateway("Internet Gateway")
        
        # Public Subnets
        with Cluster("Public Subnet (AZ1)"):
            nat = NATGateway("NAT Gateway")
            alb = ALB("Application Load Balancer")
        
        with Cluster("Public Subnet (AZ2)"):
            # Empty for high availability
            General("(Reserved for HA)")
        
        # Private Subnets
        with Cluster("Private Subnet (AZ1)"):
            backend = ECS("Backend API (Fargate)")
            rds_primary = RDS("PostgreSQL RDS Primary")
            
            # Monitoring Cluster
            with Cluster("Monitoring Stack"):
                prometheus = EC2("Prometheus")
                grafana = EC2("Grafana")
                alertmanager = EC2("Alertmanager")
        
        with Cluster("Private Subnet (AZ2)"):
            rds_standby = RDS("PostgreSQL RDS Standby")
    
    # Global Services
    with Cluster("Global AWS Services"):
        s3_frontend = S3("Frontend Static Assets")
        s3_terraform = S3("Terraform State")
        cloudfront = CloudFront("CloudFront Distribution")
        ecr = ECR("ECR Repositories")
        acm = ACM("SSL Certificate (ACM)")
        dynamodb = Dynamodb("DynamoDB (Terraform Lock)")
        secrets = SecretsManager("Secrets Manager")
        cloudwatch = Cloudwatch("CloudWatch")
    
    # Connect components
    route53 >> Edge(label="www.example.com") >> cloudfront
    route53 >> Edge(label="api.example.com") >> alb
    
    # Internet access
    igw >> alb
    
    # NAT Gateway
    backend >> nat >> igw
    
    # Load balancing
    alb >> backend
    
    # Database access
    backend >> rds_primary
    rds_primary - Edge(color="blue", style="dashed", label="Replication") - rds_standby
    
    # Frontend
    cloudfront >> s3_frontend
    
    # SSL
    acm >> cloudfront
    acm >> alb
    
    # Container Registry
    ecr >> backend
    
    # State Management
    s3_terraform - Edge(label="State Locking") - dynamodb
    
    # Secrets
    backend >> secrets
    
    # Monitoring
    backend >> cloudwatch
    rds_primary >> cloudwatch
    prometheus >> backend
    grafana >> prometheus
    alertmanager >> prometheus

print("AWS architecture diagram generated: aws_architecture.png")
