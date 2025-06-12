#!/bin/bash

# 检查是否提供了环境参数
if [ -z "$1" ]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 prod"
    exit 1
fi

ENVIRONMENT=$1

# 检查是否提供了凭证
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set"
    exit 1
fi

# 使用 AWS CLI 存储凭证到 Parameter Store
echo "Storing AWS credentials for environment: $ENVIRONMENT"

# 存储 Access Key ID
aws ssm put-parameter \
    --name "/$ENVIRONMENT/aws/access_key_id" \
    --value "$AWS_ACCESS_KEY_ID" \
    --type SecureString \
    --overwrite

# 存储 Secret Access Key
aws ssm put-parameter \
    --name "/$ENVIRONMENT/aws/secret_access_key" \
    --value "$AWS_SECRET_ACCESS_KEY" \
    --type SecureString \
    --overwrite

echo "AWS credentials stored successfully"

# 验证存储
echo "Verifying stored credentials..."
aws ssm get-parameter \
    --name "/$ENVIRONMENT/aws/access_key_id" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text

echo "Credentials stored and verified successfully" 