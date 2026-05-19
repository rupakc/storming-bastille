variable "project_id"     { type = string }
variable "region"         { type = string }
variable "frontend_image" { type = string }
variable "backend_url"    { type = string }
variable "app_name"       { type = string }

resource "google_cloud_run_v2_service" "frontend" {
  project  = var.project_id
  name     = "${var.app_name}-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    containers {
      image = var.frontend_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # The Next.js rewrite rules read this at build time (next.config.ts)
      # and at startup for SSR proxy targets.
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = var.backend_url
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  description = "Public URL of the frontend Cloud Run service"
  value       = google_cloud_run_v2_service.frontend.uri
}
