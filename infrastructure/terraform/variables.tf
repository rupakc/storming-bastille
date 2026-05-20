variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "backend_image" {
  description = "Full Artifact Registry image tag for the backend (e.g. us-central1-docker.pkg.dev/project/storming-bastille/backend:sha)"
  type        = string
}

variable "frontend_image" {
  description = "Full Artifact Registry image tag for the frontend"
  type        = string
}

variable "alert_email" {
  description = "Email address for monitoring alert notifications"
  type        = string
}

variable "admin_email" {
  description = "Email address to grant GCP project Owner role (human admin)"
  type        = string
  default     = ""
}

variable "app_name" {
  description = "Application name used to namespace GCP resources"
  type        = string
  default     = "storming-bastille"
}

variable "tf_state_bucket" {
  description = "GCS bucket used to store Terraform remote state"
  type        = string
}
