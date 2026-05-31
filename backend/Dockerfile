# syntax=docker/dockerfile:1

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOME=/app

WORKDIR $APP_HOME

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --group appuser

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies as root first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright dependencies
RUN playwright install --with-deps chromium

# Copy application code
COPY . .

# Adjust permissions
RUN chown -R appuser:appgroup $APP_HOME

# Switch to the non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
