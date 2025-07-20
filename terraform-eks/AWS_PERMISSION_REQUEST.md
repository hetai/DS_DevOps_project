## Required AWS Permissions

### Current Limitation
My user (`student15-apr-2025-fastapi`) currently has `ReadOnlyAccess` policy, which prevents infrastructure creation.

### Minimum Required Permissions
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "eks:CreateCluster",
                "eks:CreateNodegroup",
                "eks:CreateAddon",
                "ec2:CreateVpc",
                "ec2:CreateSubnet",
                "ec2:CreateSecurityGroup",
                "ec2:CreateNatGateway",
                "ec2:AllocateAddress",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:CreatePolicy",
                "iam:PassRole",
                "rds:CreateDBInstance",
                "rds:CreateDBSubnetGroup",
                "logs:CreateLogGroup"
            ],
            "Resource": "*"
        }
    ]
}
```

### Justification for Permissions
- **EKS permissions:** Required for creating optimized Kubernetes cluster
- **EC2 permissions:** Needed for cost-effective networking and compute resources
- **IAM permissions:** Essential for secure service-to-service communication
- **RDS permissions:** Database setup for application data persistence
- **Logs permissions:** Proper monitoring and debugging capabilities

