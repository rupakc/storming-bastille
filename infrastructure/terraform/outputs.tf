output "backend_url" {
  description = "Public URL of the Cloud Run backend service"
  value       = module.backend_service.url
}

output "frontend_url" {
  description = "Public URL of the Cloud Run frontend service"
  value       = module.frontend_service.url
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL (use as Docker image prefix)"
  value       = module.artifact_registry.registry_url
}

output "backup_bucket" {
  description = "GCS bucket used for SQLite database backups"
  value       = module.storage.bucket_name
}

output "deployer_sa_email" {
  description = "GitHub Actions deployer service account email"
  value       = module.iam.deployer_sa_email
}
