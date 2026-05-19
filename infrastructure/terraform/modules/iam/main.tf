variable "project_id" { type = string }
variable "region"     { type = string }
variable "app_name"   { type = string }

# ─── GitHub Actions deployer service account ─────────────────────────────────

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "${var.app_name}-deployer"
  display_name = "${var.app_name} GitHub Actions Deployer"
}

locals {
  deployer_roles = [
    "roles/run.admin",
    "roles/storage.admin",
    "roles/artifactregistry.admin",
    "roles/secretmanager.viewer",
    "roles/iam.serviceAccountUser",
  ]
}

resource "google_project_iam_member" "deployer_roles" {
  for_each = toset(local.deployer_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

output "deployer_sa_email" {
  description = "Email of the GitHub Actions deployer service account"
  value       = google_service_account.deployer.email
}
