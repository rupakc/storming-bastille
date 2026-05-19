variable "project_id" { type = string }

locals {
  # Secret shells created here; values are populated by populate-secrets.sh
  # or by the GitHub Actions bootstrap job.
  secret_names = [
    "anthropic-api-key",
    "jwt-secret-key",
    "admin-password",
  ]
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secret_names)
  project   = var.project_id
  secret_id = each.key

  replication {
    auto {}
  }
}

output "secret_ids" {
  description = "Map of secret name → Secret Manager resource ID"
  value       = { for k, v in google_secret_manager_secret.secrets : k => v.secret_id }
}
