# AWS 凭证安全管理

本项目使用 AWS Systems Manager Parameter Store 来安全地存储和管理 AWS 凭证。这种方式比使用环境变量或配置文件更安全，因为：

1. 凭证以加密形式存储
2. 访问权限可以通过 IAM 策略严格控制
3. 可以轻松地轮换和更新凭证
4. 支持不同环境的凭证管理

## 初始设置

1. 确保已安装 AWS CLI 并配置了具有管理员权限的临时凭证：

```bash
aws configure
```

2. 给存储凭证的脚本添加执行权限：

```bash
chmod +x scripts/store_aws_credentials.sh
```

3. 存储凭证到 Parameter Store：

```bash
# 设置临时凭证
export AWS_ACCESS_KEY_ID='your_access_key'
export AWS_SECRET_ACCESS_KEY='your_secret_key'

# 存储凭证（替换 prod 为实际环境）
./scripts/store_aws_credentials.sh prod
```

## 使用凭证

Ansible 会自动从 Parameter Store 获取凭证，无需手动设置环境变量。确保运行 Ansible 的用户/角色具有适当的 IAM 权限。

## 安全最佳实践

1. 定期轮换凭证
2. 使用最小权限原则配置 IAM 策略
3. 为不同环境使用不同的凭证
4. 启用 AWS CloudTrail 审计日志
5. 使用 AWS KMS 加密存储的凭证

## 凭证轮换

1. 在 AWS IAM 控制台创建新的访问密钥
2. 使用脚本存储新凭证：

```bash
export AWS_ACCESS_KEY_ID='new_access_key'
export AWS_SECRET_ACCESS_KEY='new_secret_key'
./scripts/store_aws_credentials.sh prod
```

3. 验证新凭证是否生效
4. 在 AWS IAM 控制台停用旧凭证

## 故障排除

如果遇到凭证访问问题：

1. 检查 IAM 权限是否正确配置
2. 确认 Parameter Store 中是否存在凭证
3. 验证环境变量是否正确设置
4. 检查 AWS CLI 配置是否正确

## 注意事项

- 永远不要在代码或配置文件中硬编码凭证
- 定期审计凭证使用情况
- 及时删除不再使用的凭证
- 使用 AWS CloudWatch 监控异常访问 