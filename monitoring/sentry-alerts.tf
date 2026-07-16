terraform {
  required_providers {
    sentry = {
      source  = "jianyuan/sentry"
      version = "~> 0.11.2"
    }
  }
}

variable "sentry_token" {
  description = "Sentry API token"
  type        = string
  sensitive   = true
}

provider "sentry" {
  token = var.sentry_token
}

data "sentry_organization" "org" {
  slug = "dilnova-org"
}

data "sentry_project" "dilnova" {
  organization = data.sentry_organization.org.slug
  slug         = "dilnova-production"
}

# ---------------------------------------------------------
# Error Rate Alerts (SLI: Availability)
# ---------------------------------------------------------

resource "sentry_metric_alert" "error_rate_warning" {
  organization      = data.sentry_organization.org.slug
  project           = data.sentry_project.dilnova.slug
  name              = "Warning: Error Rate > 1%"
  dataset           = "transactions"
  query             = "event.type:error"
  aggregate         = "count_percentage()"
  time_window       = 5 # 5-minute window
  threshold_type    = 0 # Above threshold
  resolve_threshold = 0.5

  trigger {
    action {
      type              = "slack"
      target_identifier = "#alerts-warning"
    }
    alert_threshold   = 1.0 # 1% error rate
    label             = "warning"
    threshold_type    = 0
  }
}

resource "sentry_metric_alert" "error_rate_critical" {
  organization      = data.sentry_organization.org.slug
  project           = data.sentry_project.dilnova.slug
  name              = "Critical: Error Rate > 5%"
  dataset           = "transactions"
  query             = "event.type:error"
  aggregate         = "count_percentage()"
  time_window       = 1 # 1-minute window
  threshold_type    = 0 # Above threshold
  resolve_threshold = 2.0

  trigger {
    action {
      type              = "slack"
      target_identifier = "#alerts-critical"
    }
    alert_threshold   = 5.0 # 5% error rate
    label             = "critical"
    threshold_type    = 0
  }
}

# ---------------------------------------------------------
# Latency Alerts (SLI: Performance)
# ---------------------------------------------------------

resource "sentry_metric_alert" "latency_warning" {
  organization      = data.sentry_organization.org.slug
  project           = data.sentry_project.dilnova.slug
  name              = "Warning: p95 Latency > 1.5s"
  dataset           = "transactions"
  query             = "transaction.op:http.server"
  aggregate         = "p95(transaction.duration)"
  time_window       = 5 # 5-minute window
  threshold_type    = 0
  resolve_threshold = 1000

  trigger {
    action {
      type              = "slack"
      target_identifier = "#alerts-warning"
    }
    alert_threshold   = 1500 # 1500ms
    label             = "warning"
    threshold_type    = 0
  }
}

resource "sentry_metric_alert" "latency_critical" {
  organization      = data.sentry_organization.org.slug
  project           = data.sentry_project.dilnova.slug
  name              = "Critical: p95 Latency > 3.0s"
  dataset           = "transactions"
  query             = "transaction.op:http.server"
  aggregate         = "p95(transaction.duration)"
  time_window       = 1 # 1-minute window
  threshold_type    = 0
  resolve_threshold = 2000

  trigger {
    action {
      type              = "slack"
      target_identifier = "#alerts-critical"
    }
    alert_threshold   = 3000 # 3000ms
    label             = "critical"
    threshold_type    = 0
  }
}

# ---------------------------------------------------------
# Issue Alerts (New Backend Errors)
# ---------------------------------------------------------

resource "sentry_issue_alert" "backend_errors" {
  organization = data.sentry_organization.org.slug
  project      = data.sentry_project.dilnova.slug
  name         = "Critical: New Backend Error / Uncaught Exception"

  action_match = "any"
  filter_match = "any"
  frequency    = 30

  conditions = [
    {
      id = "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"
    },
    {
      id = "sentry.rules.conditions.regression_event.RegressionEventCondition"
    }
  ]

  actions = [
    {
      id = "sentry.rules.actions.notify_event.NotifyEventAction"
    }
  ]
}
