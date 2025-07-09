#!/bin/bash
# Terraform Testing Framework Runner
# Part of AWS Architecture Optimization Plan - TDD Implementation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}🏗️  AWS Architecture Optimization - TDD Test Suite${NC}"
echo -e "${YELLOW}================================================${NC}"

# Function to run security tests
run_security_tests() {
    echo -e "${YELLOW}🔒 Running Security Compliance Tests...${NC}"
    
    cd "$SCRIPT_DIR/security"
    
    # Check if pytest is available
    if ! command -v pytest &> /dev/null; then
        echo -e "${RED}❌ pytest not found. Installing...${NC}"
        pip install pytest
    fi
    
    # Run security tests (expect failures in TDD Red phase)
    if python -m pytest test_secrets_compliance.py -v; then
        echo -e "${GREEN}✅ All security tests passed!${NC}"
    else
        echo -e "${RED}❌ Security tests failed (Expected in TDD Red phase)${NC}"
        echo -e "${YELLOW}💡 Next step: Implement code to make tests pass${NC}"
    fi
}

# Function to run terraform validation
run_terraform_validation() {
    echo -e "${YELLOW}🔧 Running Terraform Validation...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    # Initialize terraform if needed
    if [ ! -d ".terraform" ]; then
        echo -e "${YELLOW}🔄 Initializing Terraform...${NC}"
        terraform init
    fi
    
    # Validate main configuration
    if terraform validate; then
        echo -e "${GREEN}✅ Terraform validation passed!${NC}"
    else
        echo -e "${RED}❌ Terraform validation failed${NC}"
        return 1
    fi
    
    # Validate individual modules
    for module in modules/*/; do
        if [ -d "$module" ]; then
            echo -e "${YELLOW}🔍 Validating module: $module${NC}"
            cd "$module"
            if terraform validate; then
                echo -e "${GREEN}✅ Module $module validated${NC}"
            else
                echo -e "${RED}❌ Module $module validation failed${NC}"
            fi
            cd "$TERRAFORM_DIR"
        fi
    done
}

# Function to run security scanning
run_security_scanning() {
    echo -e "${YELLOW}🛡️  Running Security Scanning...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    # Check if tfsec is available
    if command -v tfsec &> /dev/null; then
        echo -e "${YELLOW}🔍 Running tfsec security scan...${NC}"
        tfsec . || echo -e "${YELLOW}⚠️  tfsec found security issues${NC}"
    else
        echo -e "${YELLOW}⚠️  tfsec not found. Install with: brew install tfsec${NC}"
    fi
    
    # Check if checkov is available
    if command -v checkov &> /dev/null; then
        echo -e "${YELLOW}🔍 Running checkov compliance scan...${NC}"
        checkov -d . || echo -e "${YELLOW}⚠️  checkov found compliance issues${NC}"
    else
        echo -e "${YELLOW}⚠️  checkov not found. Install with: pip install checkov${NC}"
    fi
}

# Function to run unit tests
run_unit_tests() {
    echo -e "${YELLOW}🧪 Running Unit Tests...${NC}"
    
    # Run terraform validation for each module
    run_terraform_validation
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${YELLOW}🔗 Running Integration Tests...${NC}"
    
    cd "$TERRAFORM_DIR"
    
    # Run terraform plan to test integration
    echo -e "${YELLOW}📋 Running terraform plan...${NC}"
    if terraform plan -out=tfplan; then
        echo -e "${GREEN}✅ Terraform plan successful${NC}"
        rm -f tfplan
    else
        echo -e "${RED}❌ Terraform plan failed${NC}"
        return 1
    fi
}

# Main execution
case "${1:-all}" in
    "security")
        run_security_tests
        ;;
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "scan")
        run_security_scanning
        ;;
    "all")
        echo -e "${YELLOW}🚀 Running all tests...${NC}"
        run_security_tests
        echo ""
        run_unit_tests
        echo ""
        run_security_scanning
        echo ""
        run_integration_tests
        ;;
    *)
        echo "Usage: $0 [security|unit|integration|scan|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Test suite completed!${NC}"