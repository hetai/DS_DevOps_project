#!/usr/bin/env python3
"""
Generate AWS architecture diagram from YAML file
"""

import os
import yaml
from diagrams import Diagram
from diagrams.aws.compute import EC2, ECS, ECR
from diagrams.aws.database import RDS, Dynamodb as DynamoDB
from diagrams.aws.network import VPC, InternetGateway, NATGateway, ALB, Route53
from diagrams.aws.storage import S3
from diagrams.aws.security import ACM, SecretsManager
from diagrams.aws.management import Cloudwatch as CloudWatch
from diagrams.aws.network import CloudFront

# Define component type to class mapping
COMPONENT_TYPES = {
    'aws_vpc': VPC,
    'aws_subnet': VPC,  # Using VPC for subnets as there's no specific subnet icon
    'aws_internet_gateway': InternetGateway,
    'aws_nat_gateway': NATGateway,
    'aws_alb': ALB,
    'aws_ecs_cluster': ECS,
    'aws_ecs_service': ECS,
    'aws_rds_instance': RDS,
    'aws_rds_subnet_group': RDS,  # Using RDS for subnet group
    'aws_s3_bucket': S3,
    'aws_cloudfront_distribution': CloudFront,
    'aws_ecr_repository': ECR,
    'aws_route53': Route53,
    'aws_acm': ACM,
    'aws_dynamodb_table': DynamoDB,
    'aws_secrets_manager': SecretsManager,
    'aws_cloudwatch': CloudWatch,
    'aws_ec2_instance': EC2,
}

def generate_diagram(yaml_file, output_file):
    """Generate AWS architecture diagram from YAML file"""
    # Load YAML file
    with open(yaml_file, 'r') as f:
        data = yaml.safe_load(f)
    
    # Extract metadata
    metadata = data.get('metadata', {})
    name = metadata.get('name', 'aws-architecture')
    
    # Create diagram
    with Diagram(name, filename=output_file.replace('.png', ''), show=False):
        # Create nodes
        nodes = {}
        for node_id, node_data in data.get('nodes', {}).items():
            node_type = node_data.get('type')
            node_label = node_data.get('label', node_id)
            parent_id = node_data.get('parent')
            
            # Get node class
            node_class = COMPONENT_TYPES.get(node_type, EC2)  # Default to EC2 if type not found
            
            # Create node
            node = node_class(node_label)
            nodes[node_id] = node
        
        # Create edges
        for edge in data.get('edges', []):
            from_node = edge.get('from')
            to_node = edge.get('to')
            edge_label = edge.get('label', '')
            
            if from_node in nodes and to_node in nodes:
                # Connect nodes directly with a label
                nodes[from_node] >> nodes[to_node]

if __name__ == '__main__':
    yaml_file = 'aws_architecture.yaml'
    output_file = 'aws_architecture.png'
    generate_diagram(yaml_file, output_file)
    print(f"Diagram generated: {output_file}")
