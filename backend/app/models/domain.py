from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone

from app.db.session import Base

# Association table for Many-to-Many between Submissions and Indicators
submission_indicators = Table(
    "submission_indicators",
    Base.metadata,
    Column("submission_id", String, ForeignKey("submissions.id")),
    Column("indicator_id", String, ForeignKey("indicators.id"))
)

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    raw_text = Column(String)
    defang = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="pending") # pending, processing, completed, failed
    
    indicators = relationship("Indicator", secondary=submission_indicators, back_populates="submissions")

class UserSetting(Base):
    __tablename__ = "user_settings"
    
    # Auth User UUID
    user_id = Column(String, primary_key=True, index=True)
    
    # Encrypted stored hex strings via the vault
    vt_api_key_encrypted = Column(String, nullable=True)
    urlscan_api_key_encrypted = Column(String, nullable=True)
    abuseipdb_api_key_encrypted = Column(String, nullable=True)
    greynoise_api_key_encrypted = Column(String, nullable=True)
    whoisxml_api_key_encrypted = Column(String, nullable=True)
    hybrid_analysis_api_key_encrypted = Column(String, nullable=True)
    alienvault_api_key_encrypted = Column(String, nullable=True)
    urlhaus_api_key_encrypted = Column(String, nullable=True)

class Indicator(Base):
    __tablename__ = "indicators"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    value = Column(String, index=True, nullable=False)  # The actual IP/Hash/Domain
    type = Column(String, nullable=False) # e.g., 'ipv4', 'domain', 'url', 'hash'
    analysis_status = Column(String, default="PENDING") # PENDING, ENRICHING, COMPLETED, FAILED
    
    # For Internal/External tracking (RFC 1918 pre-flight filter)
    is_internal = Column(Boolean, default=False)
    
    # TTP / Malware Family mapping
    mapped_ttp = Column(String, nullable=True)
    campaign = Column(String, nullable=True)
    
    # Context / Infrastructure
    asn = Column(String, nullable=True)
    geoip = Column(String, nullable=True)
    
    # Decay/Pruning logic metrics
    first_seen = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_seen = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    # Overall unified Threat Score (1-100)
    threat_score = Column(Integer, default=0)

    # Relationships
    dns_records = relationship("DNSRecord", back_populates="indicator", cascade="all, delete-orphan")
    submissions = relationship("Submission", secondary=submission_indicators, back_populates="indicators")
    
class DNSRecord(Base):
    __tablename__ = "dns_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    indicator_id = Column(String, ForeignKey("indicators.id"))
    record_type = Column(String) # A, MX, TXT
    value = Column(String)
    
    indicator = relationship("Indicator", back_populates="dns_records")
