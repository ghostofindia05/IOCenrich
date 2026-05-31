import uuid
from sqlalchemy import Column, String, DateTime, JSON, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
from app.db.session import Base

class AuditLog(Base):
    """
    Immutable tracking of all critical system actions.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=True) # User who initiated or System
    action = Column(String, index=True, nullable=False) # e.g., 'query_external_ti', 'capture_url_evidence'
    entity_type = Column(String, index=True, nullable=False) # e.g., 'indicator', 'submission'
    entity_id = Column(String, index=True, nullable=True)
    details = Column(JSONB, nullable=True) # Extra context
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))

