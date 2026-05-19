variable "project_id" { type = string }
variable "region"     { type = string }
variable "app_name"   { type = string }

resource "google_storage_bucket" "sqlite_backup" {
  project                     = var.project_id
  name                        = "${var.project_id}-sqlite-backup"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  # Keep the 10 most recent object versions; delete older ones to cap storage cost
  lifecycle_rule {
    condition { num_newer_versions = 10 }
    action    { type = "Delete" }
  }

  # Bucket location cannot be changed after creation. Ignore drift so Terraform
  # accepts an existing bucket regardless of which region it was originally created in.
  lifecycle {
    ignore_changes = [location]
  }
}

output "bucket_name" {
  description = "GCS bucket name used for SQLite backups"
  value       = google_storage_bucket.sqlite_backup.name
}
