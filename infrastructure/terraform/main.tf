terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
  }

  backend "gcs" {
    # bucket and prefix set via -backend-config in CI / bootstrap
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─── APIs ─────────────────────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "storage-component.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ─── Project metadata ─────────────────────────────────────────────────────────

data "google_project" "current" {
  project_id = var.project_id
}

# Identify the SA running Terraform (GitHub Actions deployer) so we can grant
# it permission to assign service accounts to Cloud Run revisions.
data "google_client_openid_userinfo" "deployer" {}

locals {
  default_compute_sa = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# ─── IAM: deployer SA → iam.serviceAccountUser ────────────────────────────────

resource "google_project_iam_member" "deployer_sa_user" {
  project    = var.project_id
  role       = "roles/iam.serviceAccountUser"
  member     = "serviceAccount:${data.google_client_openid_userinfo.deployer.email}"
  depends_on = [google_project_service.apis]
}

# Allow IAM bindings to propagate before Cloud Run services are created
resource "time_sleep" "iam_propagation" {
  create_duration = "30s"
  depends_on      = [google_project_iam_member.deployer_sa_user]
}

# ─── IAM: default Compute SA → secrets + storage ─────────────────────────────

resource "google_project_iam_member" "compute_sa_secret_accessor" {
  project    = var.project_id
  role       = "roles/secretmanager.secretAccessor"
  member     = "serviceAccount:${local.default_compute_sa}"
  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "compute_sa_storage_admin" {
  project    = var.project_id
  role       = "roles/storage.objectAdmin"
  member     = "serviceAccount:${local.default_compute_sa}"
  depends_on = [google_project_service.apis]
}

# ─── Modules ──────────────────────────────────────────────────────────────────

module "artifact_registry" {
  source     = "./modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
  app_name   = var.app_name
  depends_on = [google_project_service.apis]
}

module "iam" {
  source     = "./modules/iam"
  project_id = var.project_id
  region     = var.region
  app_name   = var.app_name
  depends_on = [google_project_service.apis]
}

module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
  depends_on = [google_project_service.apis]
}

module "storage" {
  source     = "./modules/storage"
  project_id = var.project_id
  region     = var.region
  app_name   = var.app_name
  depends_on = [google_project_service.apis]
}

module "backend_service" {
  source        = "./modules/backend_service"
  project_id    = var.project_id
  region        = var.region
  backend_image = var.backend_image
  backup_bucket = module.storage.bucket_name
  app_name      = var.app_name
  depends_on = [
    module.storage,
    module.secrets,
    google_project_iam_member.compute_sa_secret_accessor,
    time_sleep.iam_propagation,
  ]
}

module "frontend_service" {
  source         = "./modules/frontend_service"
  project_id     = var.project_id
  region         = var.region
  frontend_image = var.frontend_image
  backend_url    = module.backend_service.url
  app_name       = var.app_name
  depends_on     = [module.backend_service, time_sleep.iam_propagation]
}

module "monitoring" {
  source       = "./modules/monitoring"
  project_id   = var.project_id
  alert_email  = var.alert_email
  backend_url  = module.backend_service.url
  frontend_url = module.frontend_service.url
  app_name     = var.app_name
  depends_on   = [module.backend_service, module.frontend_service]
}
