#!/bin/bash

# Script to get GitHub OIDC provider thumbprint
# This is required for AWS OIDC provider configuration

# Get the certificate chain from GitHub's OIDC endpoint
THUMBPRINT=$(echo | openssl s_client -servername token.actions.githubusercontent.com -connect token.actions.githubusercontent.com:443 2>/dev/null | openssl x509 -fingerprint -noout -sha1 | sed 's/://g' | cut -d= -f2)

# If openssl method fails, use the known GitHub thumbprint
if [ -z "$THUMBPRINT" ]; then
    THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
fi

# Output JSON for Terraform external data source
echo "{\"thumbprint\": \"$THUMBPRINT\"}"