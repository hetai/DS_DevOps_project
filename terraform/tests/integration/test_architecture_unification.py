#!/usr/bin/env python3
"""
Architecture Unification Tests for AWS Architecture Optimization Plan
Phase 1: Architecture Unification & Performance Optimization - TDD Implementation
"""

import os
import re
import json
import pytest
from pathlib import Path

# Test configuration
TERRAFORM_DIR = Path(__file__).parent.parent.parent
MODULES_DIR = TERRAFORM_DIR / "modules"
S3_CLOUDFRONT_MODULE = MODULES_DIR / "s3_cloudfront"
ECS_MODULE = MODULES_DIR / "ecs_service"
MAIN_TF = TERRAFORM_DIR / "main.tf"

class TestS3CloudFrontOptimization:
    """Test suite for S3 + CloudFront optimization"""
    
    def test_s3_cloudfront_module_complete(self):
        """
        FAILING TEST: Verify S3+CloudFront module has all required optimizations
        Current state: Basic module exists
        Target state: Optimized with performance features
        """
        assert S3_CLOUDFRONT_MODULE.exists(), "S3+CloudFront module not found"
        
        main_tf = S3_CLOUDFRONT_MODULE / "main.tf"
        content = main_tf.read_text()
        
        # Check for performance optimizations
        assert "compress" in content and "true" in content, "CloudFront compression not enabled"
        assert "price_class" in content, "CloudFront price class not configured"
        assert "cache_behavior" in content or "ordered_cache_behavior" in content, "Cache behaviors not configured"
        
        # Check for security features
        assert "viewer_protocol_policy" in content, "HTTPS redirect not configured"
        assert "origin_access_identity" in content, "OAI not configured"
        
    def test_cloudfront_cache_optimization(self):
        """
        FAILING TEST: Verify CloudFront has optimized cache policies
        Current state: Basic caching
        Target state: Optimized cache for different content types
        """
        main_tf = S3_CLOUDFRONT_MODULE / "main.tf"
        if not main_tf.exists():
            pytest.skip("S3+CloudFront module not found")
            
        content = main_tf.read_text()
        
        # Check for static assets cache optimization
        assert "static/*" in content, "Static assets cache behavior not found"
        assert "31536000" in content, "Long-term caching for static assets not configured"
        
        # Check for index.html cache control
        assert "index.html" in content, "Index.html cache behavior not found"
        import re
        assert re.search(r"max_ttl\s*=\s*0", content), "Index.html cache prevention not configured"
    
    def test_s3_cloudfront_integrated_in_main(self):
        """
        FAILING TEST: Verify S3+CloudFront module is properly integrated
        Current state: May not be used in main configuration
        Target state: Integrated and replacing ECS frontend
        """
        if not MAIN_TF.exists():
            pytest.skip("main.tf not found")
            
        content = MAIN_TF.read_text()
        
        # Check for S3+CloudFront module usage
        assert 's3_cloudfront' in content, "S3+CloudFront module not integrated"
        assert 'module "s3_cloudfront"' in content, "S3+CloudFront module not declared"

class TestECSFrontendRemoval:
    """Test suite for ECS frontend service removal"""
    
    def test_ecs_frontend_service_removed(self):
        """
        FAILING TEST: Verify ECS frontend service is removed
        Current state: Frontend service exists in ECS
        Target state: Only backend service in ECS
        """
        ecs_main = ECS_MODULE / "main.tf"
        if not ecs_main.exists():
            pytest.skip("ECS module not found")
            
        content = ecs_main.read_text()
        
        # Frontend service should be removed
        assert 'resource "aws_ecs_service" "frontend"' not in content, "ECS frontend service still exists"
        assert 'aws_ecs_task_definition" "frontend"' not in content, "ECS frontend task definition still exists"
        
        # But backend should remain
        assert 'resource "aws_ecs_service" "backend"' in content, "ECS backend service not found"
        assert 'aws_ecs_task_definition" "backend"' in content, "ECS backend task definition not found"
    
    def test_alb_frontend_target_group_removed(self):
        """
        FAILING TEST: Verify ALB frontend target group is removed
        Current state: Frontend target group exists
        Target state: Only backend target group exists
        """
        ecs_main = ECS_MODULE / "main.tf"
        if not ecs_main.exists():
            pytest.skip("ECS module not found")
            
        content = ecs_main.read_text()
        
        # Frontend target group should be removed
        assert 'aws_lb_target_group" "frontend"' not in content, "ALB frontend target group still exists"
        
        # But backend target group should remain
        assert 'aws_lb_target_group" "backend"' in content, "ALB backend target group not found"
    
    def test_alb_listener_api_only(self):
        """
        FAILING TEST: Verify ALB listener only handles API traffic
        Current state: Handles both frontend and API traffic
        Target state: Only handles /api/* traffic to backend
        """
        ecs_main = ECS_MODULE / "main.tf"
        if not ecs_main.exists():
            pytest.skip("ECS module not found")
            
        content = ecs_main.read_text()
        
        # Should have API listener rule
        assert "path_pattern" in content, "Path pattern not found in ALB rules"
        assert "/api/*" in content, "API path pattern not found in ALB rules"
        
        # Should not have default action to frontend
        frontend_default_patterns = [
            r'default_action.*frontend',
            r'target_group_arn.*frontend'
        ]
        
        for pattern in frontend_default_patterns:
            assert not re.search(pattern, content), f"Found frontend reference in ALB: {pattern}"

class TestBackendSecurityHardening:
    """Test suite for backend security hardening"""
    
    def test_backend_in_private_subnet(self):
        """
        FAILING TEST: Verify backend ECS service is in private subnet
        Current state: May be in public subnet
        Target state: Backend in private subnet only
        """
        ecs_main = ECS_MODULE / "main.tf"
        if not ecs_main.exists():
            pytest.skip("ECS module not found")
            
        content = ecs_main.read_text()
        
        # Check backend service network configuration
        backend_service_match = re.search(
            r'resource "aws_ecs_service" "backend".*?network_configuration.*?assign_public_ip\s*=\s*(\w+)',
            content,
            re.DOTALL
        )
        
        assert backend_service_match, "Backend service network configuration not found"
        assert backend_service_match.group(1) == "false", "Backend service has public IP assigned"
    
    def test_waf_module_exists(self):
        """
        FAILING TEST: Verify WAF module exists and is configured
        Current state: No WAF protection
        Target state: WAF module protects ALB
        """
        waf_module = MODULES_DIR / "waf"
        assert waf_module.exists(), "WAF module directory not found"
        assert (waf_module / "main.tf").exists(), "WAF main.tf not found"
        assert (waf_module / "variables.tf").exists(), "WAF variables.tf not found"
        assert (waf_module / "outputs.tf").exists(), "WAF outputs.tf not found"
    
    def test_security_group_hardening(self):
        """
        FAILING TEST: Verify security groups are properly configured
        Current state: May have overly permissive rules
        Target state: Least privilege security groups
        """
        # This test would check the networking module for proper security group rules
        # For now, we'll check that the ECS service uses security groups
        ecs_main = ECS_MODULE / "main.tf"
        if not ecs_main.exists():
            pytest.skip("ECS module not found")
            
        content = ecs_main.read_text()
        
        # Check that backend service uses security groups
        assert "security_groups" in content, "Security groups not configured for ECS service"
        assert "var.ecs_security_group_id" in content, "ECS security group variable not used"

class TestPerformanceOptimization:
    """Test suite for performance optimization"""
    
    def test_cloudfront_geographic_distribution(self):
        """
        FAILING TEST: Verify CloudFront has proper geographic distribution
        Current state: Basic CloudFront setup
        Target state: Optimized for global distribution
        """
        main_tf = S3_CLOUDFRONT_MODULE / "main.tf"
        if not main_tf.exists():
            pytest.skip("S3+CloudFront module not found")
            
        content = main_tf.read_text()
        
        # Check for geographic optimization
        assert "price_class" in content, "CloudFront price class not configured"
        assert "is_ipv6_enabled" in content, "IPv6 not enabled for CloudFront"
    
    def test_s3_website_configuration(self):
        """
        FAILING TEST: Verify S3 website configuration is optimized
        Current state: Basic S3 bucket
        Target state: Optimized for static website hosting
        """
        main_tf = S3_CLOUDFRONT_MODULE / "main.tf"
        if not main_tf.exists():
            pytest.skip("S3+CloudFront module not found")
            
        content = main_tf.read_text()
        
        # Check for website configuration
        assert "aws_s3_bucket_website_configuration" in content, "S3 website configuration not found"
        assert "index_document" in content, "Index document not configured"
        assert "error_document" in content, "Error document not configured"
    
    def test_deployment_script_exists(self):
        """
        FAILING TEST: Verify automated deployment script exists
        Current state: Manual deployment
        Target state: Automated frontend deployment to S3
        """
        scripts_dir = TERRAFORM_DIR / "scripts"
        deploy_script = scripts_dir / "deploy_frontend.sh"
        
        assert scripts_dir.exists(), "Scripts directory not found"
        assert deploy_script.exists(), "Frontend deployment script not found"
        
        # Check script content
        content = deploy_script.read_text()
        assert "aws s3 sync" in content, "S3 sync command not found in deploy script"
        assert "aws cloudfront create-invalidation" in content, "CloudFront invalidation not found in deploy script"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])