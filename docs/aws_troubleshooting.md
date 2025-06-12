# AWS Deployment Troubleshooting Guide

This guide documents common issues encountered when deploying the application to AWS and their solutions.

## ECS Deployment Issues

### Frontend 502/503 Errors

#### Symptoms
- Frontend ALB returns 502 Bad Gateway or 503 Service Unavailable errors
- ECS frontend service shows no running tasks
- Health checks failing for frontend containers

#### Diagnosis Steps
1. Check ECS service status:
   ```bash
   aws ecs describe-services --cluster <cluster-name> --services <service-name>
   ```

2. View stopped task details:
   ```bash
   aws ecs describe-tasks --cluster <cluster-name> --tasks <task-arn>
   ```

3. Check CloudWatch logs for container startup issues:
   ```bash
   aws logs get-log-events --log-group-name /ecs/<service-name> --log-stream-name <log-stream-name>
   ```

#### Common Causes and Solutions

##### 1. Nginx Upstream Resolution Failure

**Problem**: Nginx in the frontend container fails to resolve the backend hostname specified in the `proxy_pass` directive.

**Error Message**: 
```
nginx: [emerg] host not found in upstream "backend" in /etc/nginx/conf.d/default.conf
```

**Solution**:
1. ECS Fargate containers cannot resolve service names directly unless AWS Cloud Map service discovery is configured.
2. Update the Nginx configuration to use the backend ALB DNS name instead:

```nginx
# Original problematic configuration
upstream backend {
    server backend:8080;
}

# Fixed configuration
upstream backend {
    server <backend-alb-dns-name>:8080;
}
```

3. Rebuild and push the frontend Docker image:
```bash
docker build -t <ecr-repo-uri>:latest .
docker push <ecr-repo-uri>:latest
```

4. Force a new deployment of the frontend service:
```bash
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

##### 2. Missing ECR Images

**Problem**: ECS tasks fail to start because the specified Docker image doesn't exist in ECR.

**Error Message**:
```
CannotPullContainerError: Error response from daemon: manifest for <ecr-repo-uri>:latest not found: manifest unknown
```

**Solution**:
1. Check if the image exists in ECR:
```bash
aws ecr describe-images --repository-name <repository-name>
```

2. Build and push the missing image:
```bash
docker build -t <ecr-repo-uri>:latest .
docker push <ecr-repo-uri>:latest
```

3. Force a new deployment of the service:
```bash
aws ecs update-service --cluster <cluster-name> --service <service-name> --force-new-deployment
```

## Monitoring and Verification

After implementing fixes, verify the resolution:

1. Check ECS service status:
```bash
aws ecs describe-services --cluster <cluster-name> --services <service-name>
```

2. Verify container health:
```bash
aws ecs describe-tasks --cluster <cluster-name> --tasks <task-arn>
```

3. Test the application endpoint:
```bash
curl -I http://<alb-dns-name>
```

A successful response should return HTTP 200 OK.

## Best Practices for AWS ECS Deployments

1. **Service Discovery**: For service-to-service communication in ECS:
   - Use AWS Cloud Map for DNS-based service discovery
   - Use ALB DNS names when services are behind load balancers
   - Avoid using container/service names directly in configurations

2. **Container Health Checks**: Implement proper health checks in your task definitions to ensure containers are running correctly.

3. **CI/CD Pipeline**: Automate Docker image builds and ECR pushes to ensure images are always available before ECS deployments.

4. **Logging**: Configure CloudWatch logs for all containers to facilitate troubleshooting.

5. **Infrastructure as Code**: Use Terraform or CloudFormation to manage ECS resources to ensure consistent deployments.
