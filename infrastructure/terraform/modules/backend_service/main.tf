variable "project_id"    { type = string }
variable "region"        { type = string }
variable "backend_image" { type = string }
variable "backup_bucket" { type = string }
variable "app_name"      { type = string }

# Optional: allow the frontend URL to be injected for CORS allow-list
variable "frontend_url" {
  type    = string
  default = ""
}

resource "google_cloud_run_v2_service" "backend" {
  project  = var.project_id
  name     = "${var.app_name}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      # ─── Plain env vars ──────────────────────────────────────────────────────
      env {
        name  = "BACKEND_HOST"
        value = "0.0.0.0"
      }
      env {
        name  = "BACKEND_PORT"
        value = "8000"
      }
      env {
        name  = "LOG_LEVEL"
        value = "INFO"
      }
      env {
        name  = "BACKUP_BUCKET"
        value = var.backup_bucket
      }
      env {
        name  = "DATA_DIR"
        value = "/app/data"
      }
      env {
        name  = "BACKUP_INTERVAL_SECONDS"
        value = "60"
      }
      env {
        name  = "FRONTEND_URL"
        value = var.frontend_url
      }

      # ─── Secrets injected from Secret Manager ────────────────────────────────
      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "anthropic-api-key"
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "jwt-secret-key"
            version = "latest"
          }
        }
      }
      env {
        name = "ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = "admin-password"
            version = "latest"
          }
        }
      }

      # ─── Health probes ───────────────────────────────────────────────────────
      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds    = 30
        failure_threshold = 3
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 12
      }
    }
  }
}

# Make the backend publicly accessible (SSE streaming requires no auth middleware)
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  description = "Public URL of the backend Cloud Run service"
  value       = google_cloud_run_v2_service.backend.uri
}
