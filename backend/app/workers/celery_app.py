from celery import Celery
import os

# Redis configuration from environment or default to localhost
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ioc_workers",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.tasks", "app.workers.playwright_worker", "app.workers.orchestrator"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True
)
