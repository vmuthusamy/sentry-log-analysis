# GCP Infrastructure for LogGuard
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "logguard"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "logguard_db" {
  name             = "logguard-db"
  database_version = "POSTGRES_15"
  region          = var.region
  
  settings {
    tier = "db-f1-micro"
    
    backup_configuration {
      enabled                        = true
      start_time                    = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 7
      }
    }
    
    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        name  = "all"
        value = "0.0.0.0/0"
      }
    }
    
    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
  
  deletion_protection = false
}

# Database
resource "google_sql_database" "logguard" {
  name     = "logguard"
  instance = google_sql_database_instance.logguard_db.name
}

# Database User
resource "google_sql_user" "logguard_user" {
  name     = var.db_user
  instance = google_sql_database_instance.logguard_db.name
  password = var.db_password
}

# Cloud Storage Bucket for logs
resource "google_storage_bucket" "logguard_logs" {
  name     = "${var.project_id}-logguard-logs"
  location = var.region
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
  
  versioning {
    enabled = true
  }
}

# Cloud Run Service
resource "google_cloud_run_service" "logguard_app" {
  name     = "logguard-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/logguard:latest"
        
        ports {
          container_port = 5000
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_user}:${var.db_password}@${google_sql_database_instance.logguard_db.ip_address.0.ip_address}/logguard"
        }
        
        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
      }
    }
    
    metadata {
      annotations = {
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.logguard_db.connection_name
        "run.googleapis.com/cpu-throttling"     = "false"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM policy for Cloud Run
resource "google_cloud_run_service_iam_member" "run_all_users" {
  service  = google_cloud_run_service.logguard_app.name
  location = google_cloud_run_service.logguard_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Monitoring Dashboard
resource "google_monitoring_dashboard" "logguard_dashboard" {
  dashboard_json = jsonencode({
    displayName = "LogGuard Metrics"
    
    mosaicLayout = {
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "File Upload Success Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"logguard-app\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
              yAxis = {
                label = "Requests/sec"
              }
            }
          }
        }
      ]
    }
  })
}

# Outputs
output "database_ip" {
  value = google_sql_database_instance.logguard_db.ip_address.0.ip_address
}

output "cloud_run_url" {
  value = google_cloud_run_service.logguard_app.status[0].url
}

output "bucket_name" {
  value = google_storage_bucket.logguard_logs.name
}