# DS_DevOps_project - Route 53 Module Outputs

output "zone_id" {
  description = "ID of the Route 53 hosted zone"
  value       = var.create_zone ? aws_route53_zone.main[0].zone_id : var.zone_id
}

output "zone_name" {
  description = "Name of the Route 53 hosted zone"
  value       = var.domain_name
}

output "nameservers" {
  description = "Nameservers of the Route 53 hosted zone"
  value       = var.create_zone ? aws_route53_zone.main[0].name_servers : []
}

output "api_fqdn" {
  description = "Fully qualified domain name for the API"
  value       = var.alb_dns_name != "" ? "${var.api_subdomain}.${var.domain_name}" : ""
}

output "www_fqdn" {
  description = "Fully qualified domain name for the www subdomain"
  value       = var.cloudfront_domain_name != "" ? "${var.www_subdomain}.${var.domain_name}" : ""
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = var.certificate_arn != "" ? var.certificate_arn : (length(aws_acm_certificate.cert) > 0 ? aws_acm_certificate.cert[0].arn : "")
}

output "certificate_validation_complete" {
  description = "Whether certificate validation is complete"
  value       = var.certificate_arn != "" ? true : (length(aws_acm_certificate.cert) > 0 ? true : false)
}
