variable "project_id" { type = string }
variable "region"     { type = string }
variable "app_name"   { type = string }

resource "google_storage_bucket" "sqlite_backup" {
  project                     = var.project_id
  name                        = "${var.project_id}-${var.app_name}-data"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true

  versioning {
    enabled = true
  }

  # Keep the 10 most recent object versions; delete older ones to cap storage cost
  lifecycle_rule {
    condition { num_newer_versions = 10 }
    action    { type = "Delete" }
  }
}

output "bucket_name" {
  description = "GCS bucket name used for SQLite backups"
  value       = google_storage_bucket.sqlite_backup.name
}
