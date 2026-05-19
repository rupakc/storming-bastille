FROM python:3.12-slim

WORKDIR /app

# Install system deps (for beautifulsoup4 / lxml)
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast, reproducible dependency installs
# Upgrade pip first to avoid CVEs in the bundled pip version
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir uv

# Install Python dependencies first (layer cache)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application source
COPY app/ ./app/

# Ensure data directory exists
RUN mkdir -p /app/data

# ─── GCS backup / restore ────────────────────────────────────────────────────
# gcs_backup.py: Python-based backup using google-cloud-storage (ADC on Cloud Run)
# docker-entrypoint.sh: restore on cold start, periodic 5-min sync, SIGTERM flush
COPY gcs_backup.py /app/gcs_backup.py
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
