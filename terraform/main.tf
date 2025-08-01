# Terraform configuration for Sentry on GCP
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "sentry-log-analysis"
}

# Configure the Google Cloud provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "sql-component.googleapis.com"
  ])

  service = each.value
  project = var.project_id

  disable_dependent_services = true
}

# Secret Manager for sensitive data
resource "google_secret_manager_secret" "sentry_secrets" {
  secret_id = "sentry-secrets"
  project   = var.project_id

  replication {
    automatic = true
  }

  depends_on = [google_project_service.apis]
}

# Cloud SQL PostgreSQL instance (optional)
resource "google_sql_database_instance" "sentry_db" {
  name             = "sentry-postgres"
  database_version = "POSTGRES_14"
  region           = var.region
  project          = var.project_id

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 20

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        name  = "all"
        value = "0.0.0.0/0"
      }
    }
  }

  deletion_protection = false
  depends_on         = [google_project_service.apis]
}

# Database
resource "google_sql_database" "sentry_database" {
  name     = "sentry_db"
  instance = google_sql_database_instance.sentry_db.name
  project  = var.project_id
}

# Database user
resource "google_sql_user" "sentry_user" {
  name     = "sentry_user"
  instance = google_sql_database_instance.sentry_db.name
  password = random_password.db_password.result
  project  = var.project_id
}

resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Cloud Run service
resource "google_cloud_run_service" "sentry" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/sentry-log-analysis:latest"
        
        ports {
          container_port = 5000
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "PORT"
          value = "5000"
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.sentry_secrets.secret_id
              key  = "database-url"
            }
          }
        }

        env {
          name = "SESSION_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.sentry_secrets.secret_id
              key  = "session-secret"
            }
          }
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "4Gi"
          }
          requests = {
            cpu    = "1"
            memory = "2Gi"
          }
        }
      }

      container_concurrency = 80
      timeout_seconds      = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "autoscaling.knative.dev/minScale" = "1"
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/cpu-throttling" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.apis]
}

# IAM policy for public access
resource "google_cloud_run_service_iam_policy" "noauth" {
  location = google_cloud_run_service.sentry.location
  project  = google_cloud_run_service.sentry.project
  service  = google_cloud_run_service.sentry.name

  policy_data = data.google_iam_policy.noauth.policy_data
}

data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

# Outputs
output "service_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_service.sentry.status[0].url
}

output "database_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.sentry_db.connection_name
}

output "database_url" {
  description = "Database URL for environment variables"
  value       = "postgresql://${google_sql_user.sentry_user.name}:${random_password.db_password.result}@/${google_sql_database.sentry_database.name}?host=/cloudsql/${google_sql_database_instance.sentry_db.connection_name}"
  sensitive   = true
}