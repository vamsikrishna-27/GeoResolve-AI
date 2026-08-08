import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import (
    String, 
    Integer, 
    ForeignKey, 
    DateTime, 
    Date, 
    Numeric, 
    Text, 
    Uuid, 
    Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

# ------------------------------------------------------------------
# 1. USER MODEL
# ------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="User", index=True, nullable=False) # 'Admin', 'Developer', 'User'
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    api_keys: Mapped[List["ApiKey"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    history: Mapped[List["SearchHistory"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")

# ------------------------------------------------------------------
# 2. API KEY MODEL
# ------------------------------------------------------------------
class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False) # 'Active', 'Revoked'
    usage_count: Mapped[int] = mapped_column(Integer, name="usage", default=0, nullable=False)
    max_limit: Mapped[int] = mapped_column(Integer, default=25000, nullable=False)
    expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="api_keys")

# ------------------------------------------------------------------
# 3. ADDRESS REQUEST MODEL (addresses table)
# ------------------------------------------------------------------
class AddressRequest(Base):
    __tablename__ = "addresses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    raw_address: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    locality: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    pincode: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)
    language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    result: Mapped[Optional["AddressResult"]] = relationship(back_populates="address", cascade="all, delete-orphan")

# ------------------------------------------------------------------
# 4. ADDRESS RESULT MODEL (resolved_addresses table)
# ------------------------------------------------------------------
class AddressResult(Base):
    __tablename__ = "resolved_addresses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    address_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("addresses.id", ondelete="CASCADE"), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False) # Precision support for lat/lon coordinates
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False)
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    matched_landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    matched_pincode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    nearby_pois: Mapped[Optional[str]] = mapped_column(Text, default="[]", nullable=True) # Stored as JSON string
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Success", nullable=False) # 'Success', 'Cached', 'Failed'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    address: Mapped["AddressRequest"] = relationship(back_populates="result")
    history_entries: Mapped[List["SearchHistory"]] = relationship(back_populates="resolved_address", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_resolved_lat_lon", "latitude", "longitude"),
    )

# ------------------------------------------------------------------
# 5. SEARCH HISTORY MODEL (search_history table)
# ------------------------------------------------------------------
class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    raw_address: Mapped[str] = mapped_column(Text, nullable=False)
    resolved_address_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("resolved_addresses.id", ondelete="SET NULL"), nullable=True)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="history")
    resolved_address: Mapped[Optional["AddressResult"]] = relationship(back_populates="history_entries")

# ------------------------------------------------------------------
# 6. AUDIT LOG MODEL (audit_logs table)
# ------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    original_address: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_address: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped[Optional["User"]] = relationship(back_populates="audit_logs")

# ------------------------------------------------------------------
# 7. ANALYTICS MODEL (analytics table)
# ------------------------------------------------------------------
class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_confidence: Mapped[float] = mapped_column(Numeric(3, 2), default=0.0, nullable=False)
    avg_latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cache_hit_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    timestamp: Mapped[date] = mapped_column(Date, unique=True, default=date.today, nullable=False)

# ------------------------------------------------------------------
# 8. CACHE ENTRY MODEL (cache table)
# ------------------------------------------------------------------
class CacheEntry(Base):
    __tablename__ = "cache"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False) # Stored as JSON string
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
