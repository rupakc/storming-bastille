"""
Test configuration: force the settings singleton to use test values before any
app code is imported, and isolate tests from local database state by routing
all DB operations to a temporary directory.

This conftest is loaded by pytest before any test module is collected.
"""

import os
import tempfile

# Create a temp directory for test DBs — isolated from local data/
_TEST_DB_DIR = tempfile.mkdtemp(prefix="bastille_test_")

# Must be set before any app module is imported.
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32-chars-long!!"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "test-admin-password-123"
os.environ["DATABASE_PATH"] = f"{_TEST_DB_DIR}/bastille.db"

import importlib  # noqa: E402


def _patch_settings() -> None:
    """Bust the LRU cache and patch all module-level settings references."""
    from app.core import config as _config

    _config.get_settings.cache_clear()
    fresh = _config.get_settings()
    _config.settings = fresh

    # Patch every module that imported `settings` at module level.
    for mod_name in (
        "app.core.auth",
        "app.core.anthropic_client",
        "app.db.users_db",
        "app.main",
    ):
        try:
            mod = importlib.import_module(mod_name)
            if hasattr(mod, "settings"):
                mod.settings = fresh
        except Exception:
            pass


_patch_settings()
