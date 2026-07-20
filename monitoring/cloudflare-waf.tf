terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the application"
  type        = string
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ---------------------------------------------------------
# Baseline WAF Rate Limiting (Infrastructure Layer)
# ---------------------------------------------------------
# This rule enforces a strict baseline rate limit at the Cloudflare edge.
# It ensures that even if the application-level rate limiter (Upstash) fails open
# in production, the backend database and services remain protected from volumetric 
# DDoS or brute-force attacks.

resource "cloudflare_ruleset" "baseline_rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "Strict Baseline Rate Limiting"
  description = "Protects backend infrastructure if application-level rate limiting fails open"
  kind        = "zone"
  phase       = "http_rate_limit"

  rules {
    action = "block"
    action_parameters {
      response {
        status_code  = 429
        content      = "Too Many Requests - Blocked by Cloudflare WAF"
        content_type = "text/plain"
      }
    }
    
    description = "Global IP rate limit - 500 requests per minute"
    expression  = "(http.request.uri.path wildcard \"/*\")"
    
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 500
      mitigation_timeout  = 300 # Block for 5 minutes
    }
  }
}
