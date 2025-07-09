# Terraform Testing Framework

This directory contains tests for validating the AWS infrastructure implementation according to the architecture optimization plan.

## Test Structure

- `unit/` - Unit tests for individual Terraform modules
- `integration/` - Integration tests for complete infrastructure
- `security/` - Security compliance tests
- `performance/` - Performance validation tests

## Test Requirements

### Phase 0: Basic Security Hardening
- ✅ No hardcoded secrets in terraform.tfvars
- ✅ Secrets Manager module exists and works
- ✅ Environment isolation is properly configured
- ✅ S3+CloudFront module validation

### Phase 1: Architecture Unification
- ✅ ECS frontend services removed
- ✅ S3+CloudFront fully operational
- ✅ Backend security hardening complete
- ✅ Performance optimization implemented

## Running Tests

```bash
# Run all tests
./run_tests.sh

# Run specific test suite
./run_tests.sh unit
./run_tests.sh security
./run_tests.sh integration
```

## Test Tools

- terraform validate
- terraform plan
- tfsec (security scanning)
- checkov (compliance checking)
- terratest (Go-based testing)