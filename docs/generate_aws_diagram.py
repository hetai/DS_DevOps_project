#!/usr/bin/env python3
"""
Generate AWS architecture diagram from YAML file with horizontal layout
"""

import os
import yaml
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2, ECS, ECR, EKS
from diagrams.aws.database import RDS, Dynamodb as DynamoDB
from diagrams.aws.network import VPC, InternetGateway, NATGateway, ALB, Route53, CloudFront
from diagrams.aws.storage import S3
from diagrams.aws.security import ACM, SecretsManager, WAF
from diagrams.aws.management import Cloudwatch as CloudWatch

# Define component type to class mapping
COMPONENT_TYPES = {
    'aws_vpc': VPC,
    'aws_subnet': VPC,
    'aws_internet_gateway': InternetGateway,
    'aws_nat_gateway': NATGateway,
    'aws_alb': ALB,
    'aws_ecs_cluster': ECS,
    'aws_ecs_service': ECS,
    'aws_eks_cluster': EKS,
    'aws_eks_node_group': EKS,
    'aws_k8s_deployment': EKS,
    'aws_rds_instance': RDS,
    'aws_rds_subnet_group': RDS,
    'aws_s3_bucket': S3,
    'aws_cloudfront_distribution': CloudFront,
    'aws_ecr_repository': ECR,
    'aws_route53': Route53,
    'aws_acm': ACM,
    'aws_dynamodb_table': DynamoDB,
    'aws_secrets_manager': SecretsManager,
    'aws_cloudwatch': CloudWatch,
    'aws_managed_prometheus': CloudWatch,
    'aws_waf': WAF,
    'aws_ec2_instance': EC2,
}

def generate_diagram(yaml_file, output_file):
    """Generate AWS architecture diagram with VPC structure and optimized layout"""
    # Create diagram with proper VPC structure and readable fonts
    with Diagram(
        "AI-Enhanced ASAM OpenX AWS Architecture",
        filename=output_file.replace('.png', ''),
        show=False,
        direction="TB",  # Top to Bottom layout for better VPC visualization
        graph_attr={
            "fontsize": "50",
            "bgcolor": "white",
            "pad": "1.0",
            "nodesep": "6.0",
            "ranksep": "8.0",
            "size": "40,30!",
            "dpi": "300",
            "splines": "ortho"
        },
        node_attr={
            "fontsize": "36",
            "width": "6.0",
            "height": "4.0",
            "margin": "1.0,0.6",
            "shape": "box",
            "style": "rounded"
        },
        edge_attr={
            "fontsize": "24",
            "minlen": "2",
            "penwidth": "4",
            "arrowsize": "2.0"
        }
    ):
        # DNS & CDN Layer (Outside VPC)
        with Cluster("DNS & Content Delivery", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "lightblue", "margin": "45", "penwidth": "4"}):
            route53 = Route53("Route 53\nDNS")
            cloudfront = CloudFront("CloudFront\nCDN")
            waf = WAF("WAF\nFirewall")
            acm = ACM("SSL\nCertificates")
        
        # Frontend Layer (Outside VPC)
        with Cluster("Frontend Layer", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "lightyellow", "margin": "45", "penwidth": "4"}):
            s3_frontend = S3("React App\nStatic Files")
        
        # Main VPC
        with Cluster("VPC - AI-Enhanced ASAM OpenX", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "lightcyan", "margin": "45", "penwidth": "4"}):
            
            # Internet Gateway
            igw = InternetGateway("Internet\nGateway")
            
            # Public Subnet
            with Cluster("Public Subnet", graph_attr={"fontsize": "34", "style": "rounded,filled", "fillcolor": "lightgreen", "margin": "35", "penwidth": "4"}):
                alb = ALB("ALB\nLoad Balancer")
                nat_gw = NATGateway("NAT\nGateway")
            
            # Private Subnet - Application Tier
            with Cluster("Private Subnet - Application Tier", graph_attr={"fontsize": "34", "style": "rounded,filled", "fillcolor": "lightpink", "margin": "35", "penwidth": "4"}):
                eks = EKS("EKS Cluster\nv1.30")
                eks_nodes = EKS("Worker Nodes\nt3.small Spot")
                backend = EKS("Backend API\nFastAPI + AI")
            
            # Private Subnet - Database Tier
            with Cluster("Private Subnet - Database Tier", graph_attr={"fontsize": "34", "style": "rounded,filled", "fillcolor": "#fff0e6", "margin": "35", "penwidth": "4"}):
                rds_primary = RDS("PostgreSQL\nPrimary")
                rds_standby = RDS("PostgreSQL\nStandby")
        
        # Security & Registry Layer (Outside VPC)
        with Cluster("Security & Registry", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "lightcoral", "margin": "45", "penwidth": "4"}):
            secrets = SecretsManager("Secrets\nManager")
            ecr = ECR("Container\nRegistry")
        
        # Monitoring Layer (Outside VPC)
        with Cluster("Monitoring", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "lightgray", "margin": "45", "penwidth": "4"}):
            cloudwatch = CloudWatch("CloudWatch\nMetrics")
            prometheus = CloudWatch("Managed\nPrometheus")
        
        # State Management Layer (Outside VPC)
        with Cluster("Infrastructure State", graph_attr={"fontsize": "40", "style": "rounded,filled", "fillcolor": "wheat", "margin": "45", "penwidth": "4"}):
            s3_state = S3("Terraform\nState")
            dynamodb = DynamoDB("State\nLocking")
        
        # Create connections (top to bottom flow with VPC structure)
        route53 >> cloudfront >> s3_frontend
        route53 >> igw
        waf >> cloudfront
        waf >> alb
        acm >> [cloudfront, alb]
        
        igw >> alb
        alb >> backend
        nat_gw >> eks_nodes
        eks >> eks_nodes >> backend
        backend >> rds_primary
        rds_primary >> rds_standby
        
        backend >> secrets
        ecr >> eks_nodes
        
        [backend, rds_primary] >> cloudwatch
        eks >> prometheus
        
        s3_state >> dynamodb

if __name__ == '__main__':
    yaml_file = 'aws_architecture.yaml'
    output_file = 'aws_architecture.png'
    generate_diagram(yaml_file, output_file)
    print(f"Diagram generated: {output_file}")
