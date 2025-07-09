# Terraform Backend Configuration
# This file is auto-generated for remote state management

terraform {
  backend "s3" {
    bucket         = "ds-devops-project-terraform-state"
    key            = "terraform.tfstate"
    region         = "eu-west-3"
    dynamodb_table = "ds-devops-terraform-locks"
    encrypt        = true
  }
}
