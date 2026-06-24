terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

variable "vercel_api_token" {
  type        = string
  sensitive   = true
  description = "Vercel API Token for provisioning the log drain"
}

variable "vercel_project_id" {
  type        = string
  description = "The Vercel Project ID to attach the log drain to"
}

variable "axiom_drain_url" {
  type        = string
  sensitive   = true
  description = "Axiom Log Drain HTTP Endpoint (including ingest token)"
}

provider "vercel" {
  api_token = var.vercel_api_token
}

resource "vercel_log_drain" "axiom_compliance_drain" {
  project_id   = var.vercel_project_id
  name         = "Axiom Forensic Log Drain (90-Day Retention)"
  endpoint     = var.axiom_drain_url
  environments = ["production"]
  sources      = ["static", "lambda", "edge", "build", "external"]
}
