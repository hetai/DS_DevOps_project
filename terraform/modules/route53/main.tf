# DS_DevOps_project - Route 53 Module

# Create Route 53 hosted zone if requested
resource "aws_route53_zone" "main" {
  count = var.create_zone ? 1 : 0
  name  = var.domain_name
  
  tags = {
    Name        = "${var.environment}-${var.domain_name}-zone"
    Environment = var.environment
  }
}

locals {
  zone_id = var.create_zone ? aws_route53_zone.main[0].zone_id : var.zone_id
}

# Create A record for API subdomain pointing to ALB
resource "aws_route53_record" "api" {
  count   = var.alb_dns_name != "" ? 1 : 0
  zone_id = local.zone_id
  name    = "${var.api_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Create A record for www subdomain pointing to CloudFront
resource "aws_route53_record" "www" {
  count   = var.cloudfront_domain_name != "" ? 1 : 0
  zone_id = local.zone_id
  name    = "${var.www_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# Create A record for apex domain pointing to CloudFront
resource "aws_route53_record" "apex" {
  count   = var.cloudfront_domain_name != "" ? 1 : 0
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# Create validation records for ACM certificate if certificate ARN is provided
# This assumes the certificate was created in the same Terraform configuration
# and the validation records are available
resource "aws_route53_record" "cert_validation" {
  for_each = var.certificate_arn != "" ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Create ACM certificate if certificate ARN is not provided
resource "aws_acm_certificate" "cert" {
  count = var.certificate_arn == "" ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "${var.api_subdomain}.${var.domain_name}",
    "${var.www_subdomain}.${var.domain_name}"
  ]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.environment}-${var.domain_name}-cert"
    Environment = var.environment
  }
}
