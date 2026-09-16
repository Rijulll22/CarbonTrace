"""
CarbonTrace SQLAlchemy 2.x Data Models.

Defines the core relational schema for Companies, Suppliers, and Carbon Activities.
Emissions calculations and verification hashing remain external in carbon.py
and verification.py to maintain separation of concerns and audit integrity.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Company(Base):
    """
    Reporting enterprise or parent entity.
    Aggregates overall emissions, suppliers, and Scope 1/2/3 activities.
    """

    __tablename__ = "companies"

    company_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    company_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    industry: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships (no cascade delete to preserve historical reporting and audit trail)
    suppliers: Mapped[list["Supplier"]] = relationship(
        "Supplier",
        back_populates="company",
    )
    carbon_activities: Mapped[list["CarbonActivity"]] = relationship(
        "CarbonActivity",
        back_populates="company",
    )


class Supplier(Base):
    """
    Value-chain vendor / tier supplier associated with a reporting company.
    Provides primary/estimated activity data for Scope 3 emissions.
    """

    __tablename__ = "suppliers"

    supplier_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    company_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("companies.company_id"),
        nullable=False,
        index=True,
    )
    supplier_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    industry: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    company: Mapped["Company"] = relationship(
        "Company",
        back_populates="suppliers",
    )
    carbon_activities: Mapped[list["CarbonActivity"]] = relationship(
        "CarbonActivity",
        back_populates="supplier",
    )


class CarbonActivity(Base):
    """
    Core emissions activity entry.
    Records activity quantities, the audit-locked emission factor used,
    calculated emissions_kgco2e, and data quality flags (primary vs. estimated).
    """

    __tablename__ = "carbon_activities"

    entry_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    company_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("companies.company_id"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("suppliers.supplier_id"),
        nullable=True,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    activity_quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    activity_unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    emission_factor: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    emissions_kgco2e: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_flagged: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    company: Mapped["Company"] = relationship(
        "Company",
        back_populates="carbon_activities",
    )
    supplier: Mapped[Optional["Supplier"]] = relationship(
        "Supplier",
        back_populates="carbon_activities",
    )
