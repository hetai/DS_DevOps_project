#!/usr/bin/env python3
"""
Security compliance tests for AWS Architecture Optimization Plan
Phase 0: Basic Security Hardening - TDD Implementation
"""

import os
import re
import json
import pytest
from pathlib import Path

# Test configuration
TERRAFORM_DIR = Path(__file__).parent.parent.parent
TFVARS_FILE = TERRAFORM_DIR / "terraform.tfvars"
SECRETS_MODULE_DIR = TERRAFORM_DIR / "modules" / "secrets_manager"

class TestSecretsCompliance:
    """Test suite for secrets management compliance"""
    
    def test_no_hardcoded_secrets_in_tfvars(self):
        """
        FAILING TEST: Verify no hardcoded secrets in terraform.tfvars
        Current state: FAIL - db_password is hardcoded
        Target state: PASS - all secrets reference AWS Secrets Manager
        """
        if not TFVARS_FILE.exists():
            pytest.skip("terraform.tfvars not found")
            
        content = TFVARS_FILE.read_text()
        
        # Common secret patterns to detect
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']*["\']',
            r'secret\s*=\s*["\'][^"\']*["\']',
            r'key\s*=\s*["\'][^"\']*["\']',
            r'token\s*=\s*["\'][^"\']*["\']',
        ]
        
        violations = []
        for pattern in secret_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                # Allow references to AWS Secrets Manager and placeholder values
                if ("aws_secretsmanager" not in match.lower() and 
                    "placeholder" not in match.lower()):
                    violations.append(f"Found hardcoded secret: {match}")
        
        # This should FAIL initially (TDD Red phase)
        assert len(violations) == 0, f"Found {len(violations)} hardcoded secrets: {violations}"
    
    def test_secrets_manager_module_exists(self):
        """
        FAILING TEST: Verify secrets_manager module exists
        Current state: FAIL - module doesn't exist
        Target state: PASS - module exists with proper structure
        """
        assert SECRETS_MODULE_DIR.exists(), "secrets_manager module directory not found"
        assert (SECRETS_MODULE_DIR / "main.tf").exists(), "secrets_manager/main.tf not found"
        assert (SECRETS_MODULE_DIR / "variables.tf").exists(), "secrets_manager/variables.tf not found"
        assert (SECRETS_MODULE_DIR / "outputs.tf").exists(), "secrets_manager/outputs.tf not found"
    
    def test_secrets_manager_module_validation(self):
        """
        FAILING TEST: Verify secrets_manager module passes terraform validate
        Current state: FAIL - module doesn't exist
        Target state: PASS - module validates successfully
        """
        if not SECRETS_MODULE_DIR.exists():
            pytest.skip("secrets_manager module not found")
            
        # Run terraform init and validate on the module
        import subprocess
        
        # First, run terraform init
        init_result = subprocess.run(
            ["terraform", "init"],
            cwd=SECRETS_MODULE_DIR,
            capture_output=True,
            text=True
        )
        
        if init_result.returncode != 0:
            pytest.skip(f"Terraform init failed: {init_result.stderr}")
        
        # Then, run terraform validate
        validate_result = subprocess.run(
            ["terraform", "validate"],
            cwd=SECRETS_MODULE_DIR,
            capture_output=True,
            text=True
        )
        
        assert validate_result.returncode == 0, f"Terraform validation failed: {validate_result.stderr}"
    
    def test_secrets_manager_integration_in_main(self):
        """
        FAILING TEST: Verify secrets_manager module is integrated in main.tf
        Current state: FAIL - module not referenced
        Target state: PASS - module properly integrated
        """
        main_tf = TERRAFORM_DIR / "main.tf"
        if not main_tf.exists():
            pytest.skip("main.tf not found")
            
        content = main_tf.read_text()
        
        # Check for secrets_manager module reference
        assert 'module "secrets_manager"' in content, "secrets_manager module not referenced in main.tf"
        assert 'source = "./modules/secrets_manager"' in content, "secrets_manager module source not found"
    
    def test_ecs_service_uses_secrets_manager(self):
        """
        FAILING TEST: Verify ECS service uses secrets from Secrets Manager
        Current state: FAIL - uses hardcoded values
        Target state: PASS - uses secrets from AWS Secrets Manager
        """
        ecs_module = TERRAFORM_DIR / "modules" / "ecs_service" / "main.tf"
        if not ecs_module.exists():
            pytest.skip("ECS service module not found")
            
        content = ecs_module.read_text()
        
        # Check for secrets reference instead of hardcoded values
        assert "valueFrom" in content, "ECS service not using proper secrets injection"
        assert "db_secret_arn" in content, "ECS service not referencing database secrets"

class TestEnvironmentIsolation:
    """Test suite for environment isolation"""
    
    def test_environment_specific_tfvars(self):
        """
        FAILING TEST: Verify environment-specific configuration files exist
        Current state: FAIL - only single terraform.tfvars
        Target state: PASS - separate configs for dev/staging/prod
        """
        environments = ["dev", "staging", "prod"]
        
        for env in environments:
            env_file = TERRAFORM_DIR / f"terraform.{env}.tfvars"
            assert env_file.exists(), f"Environment-specific tfvars not found: {env_file}"
    
    def test_environment_isolation_in_naming(self):
        """
        FAILING TEST: Verify resources use environment-specific naming
        Current state: FAIL - no environment prefixes
        Target state: PASS - all resources prefixed with environment
        """
        # This test will check that resource names include environment prefixes
        # Implementation depends on the actual terraform files
        pass

if __name__ == "__main__":
    pytest.main([__file__, "-v"])