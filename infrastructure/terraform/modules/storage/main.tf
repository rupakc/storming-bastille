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

  # Never allow Terraform to destroy or replace this bucket — it holds the only
  # copy of the SQLite databases. prevent_destroy blocks both terraform destroy
  # and any plan that would replace the resource (e.g. name or location change).
  lifecycle {
    prevent_destroy = true
    ignore_changes  = [location]
  }
}

output "bucket_name" {
  description = "GCS bucket name used for SQLite backups"
  value       = google_storage_bucket.sqlite_backup.name
}
