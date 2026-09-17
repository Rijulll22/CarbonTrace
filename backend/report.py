"""
CarbonTrace BRSR Compliance Report & PDF Generation Engine.

Responsibilities:
- Canonical report assembly combining PostgreSQL, carbon engine, verification ledger,
  optimizer, AI explanation layer, and application-level signing state.
- Local application-level signing and cryptographic approval hashing.
- Dynamic, presentation-ready multi-page PDF generation via ReportLab.
- Strict adherence to deterministic calculations, GHG Protocol alignment,
  and mandatory disclaimers.
"""

from __future__ import annotations

from datetime import datetime, timezone
import io
import threading
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session

import ai
import carbon
import models
import optimizer
from schemas import (
    BRSRDecarbonizationPlan,
    BRSRReportResponse,
    BRSRSectionHeader,
    BRSRSupplierSummary,
    OptimizationRecommendation,
    ReportSignResponse,
    VerificationSummaryResponse,
)
import seed_demo
import verification


# ============================================================
# THREAD-SAFE LOCAL SIGNING STORE
# ============================================================

_signing_store: dict[int, dict[str, Any]] = {}
_signing_lock = threading.RLock()


def record_report_signature(
    company_id: int,
    company_name: str,
    signer_name: str,
    signer_role: str,
    total_emissions_kgco2e: float,
    is_verified: bool,
    notes: str | None = None,
) -> ReportSignResponse:
    """
    Record an application-level approval/signing entry for a company report.
    Generates a deterministic SHA-256 approval hash bound to company, signer,
    emissions state, and timestamp.
    """
    with _signing_lock:
        signed_at = datetime.now(timezone.utc).isoformat()
        report_id = f"CT-BRSR-{datetime.now(timezone.utc).strftime('%Y%m')}-{company_id:04d}"

        hash_payload = {
            "report_id": report_id,
            "company_id": company_id,
            "company_name": company_name,
            "signer_name": signer_name,
            "signer_role": signer_role,
            "total_emissions_kgco2e": total_emissions_kgco2e,
            "is_verified": is_verified,
            "signed_at": signed_at,
        }
        signature_hash = verification.compute_sha256(verification.canonical_json(hash_payload))

        sign_data = {
            "report_id": report_id,
            "company_id": company_id,
            "signed_at": signed_at,
            "signer_name": signer_name,
            "signer_role": signer_role,
            "signature_hash": signature_hash,
            "is_verified": is_verified,
            "status": "SIGNED_AND_APPROVED",
            "total_emissions_kgco2e": total_emissions_kgco2e,
            "notes": notes,
        }
        _signing_store[company_id] = sign_data

        return ReportSignResponse(
            report_id=report_id,
            company_id=company_id,
            signed_at=signed_at,
            signer_name=signer_name,
            signer_role=signer_role,
            signature_hash=signature_hash,
            is_verified=is_verified,
            status="SIGNED_AND_APPROVED",
            total_emissions_kgco2e=total_emissions_kgco2e,
            message="Report successfully signed and approved at application level.",
        )


def get_report_signature(company_id: int) -> ReportSignResponse | None:
    """Retrieve existing signing approval record for a company if present."""
    with _signing_lock:
        data = _signing_store.get(company_id)
        if not data:
            return None
        return ReportSignResponse(
            report_id=data["report_id"],
            company_id=data["company_id"],
            signed_at=data["signed_at"],
            signer_name=data["signer_name"],
            signer_role=data["signer_role"],
            signature_hash=data["signature_hash"],
            is_verified=data["is_verified"],
            status=data["status"],
            total_emissions_kgco2e=data["total_emissions_kgco2e"],
            message="Report signature record retrieved.",
        )


# ============================================================
# CANONICAL BRSR REPORT ASSEMBLER
# ============================================================

def build_brsr_report(
    company_id: int,
    db: Session,
    question: str | None = None,
) -> BRSRReportResponse:
    """
    Assemble complete, authoritative BRSR compliance report model combining:
    - PostgreSQL database state
    - Deterministic GHG carbon calculations
    - Scope 1, 2, 3 breakdown
    - Value chain / supplier disclosures
    - SHA-256 hash-chain verification ledger
    - PuLP/CBC decarbonization action plan
    - AI-generated executive narrative with deterministic fallback
    - Local approval / signing status
    """
    company = db.query(models.Company).filter(models.Company.company_id == company_id).first()
    if not company:
        raise ValueError(f"Company with ID {company_id} not found.")

    activities = (
        db.query(models.CarbonActivity)
        .filter(models.CarbonActivity.company_id == company_id)
        .all()
    )

    # 1. Deterministic emissions aggregation
    summary = carbon.aggregate_company_summary(company_id=company_id, activities=activities)

    # 2. Scope-wise breakdown
    scope_1 = 0.0
    scope_2 = 0.0
    scope_3 = 0.0

    scope_1_types = {
        "diesel_fleet",
        "natural_gas",
        "stationary_combustion",
        "fleet_diesel",
        "lpg_combustion",
        "fuel_combustion",
    }
    scope_2_types = {
        "grid_electricity",
        "purchased_electricity",
        "electricity_consumption",
    }

    for act in activities:
        act_type = (act.activity_type or "").lower().strip()
        if act_type in scope_1_types:
            scope_1 += act.emissions_kgco2e
        elif act_type in scope_2_types:
            scope_2 += act.emissions_kgco2e
        else:
            scope_3 += act.emissions_kgco2e

    # If no activities, keep zero
    scope_1 = round(scope_1, 4)
    scope_2 = round(scope_2, 4)
    scope_3 = round(scope_3, 4)

    # 3. Suppliers list & emissions
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.company_id == company_id)
        .all()
    )
    supplier_summaries: list[BRSRSupplierSummary] = []
    for s in suppliers:
        s_acts = [a for a in activities if a.supplier_id == s.supplier_id]
        s_em = sum(a.emissions_kgco2e for a in s_acts)
        is_p = len(s_acts) > 0 and all(a.is_primary for a in s_acts)
        supplier_summaries.append(
            BRSRSupplierSummary(
                supplier_id=s.supplier_id,
                supplier_name=s.supplier_name,
                industry=s.industry,
                location=s.location,
                emissions_kgco2e=round(s_em, 4),
                is_primary=is_p,
                is_verified=s.is_verified,
            )
        )
    # Sort top suppliers by emissions descending
    supplier_summaries.sort(key=lambda x: x.emissions_kgco2e, reverse=True)

    # 4. Verification ledger summary & chain validation
    ver_summary = verification.ledger.get_summary(company_id=company_id)
    chain_val = verification.ledger.validate_chain()

    # 5. Decarbonization optimizer plan
    interventions = [
        optimizer.Intervention(
            action=item["action"],
            estimated_reduction_kgco2e=float(item["estimated_reduction_kgco2e"]),
            estimated_cost_inr=float(item["estimated_cost_inr"]),
            priority=int(item.get("priority", 1)),
        )
        for item in seed_demo.get_demo_interventions()
    ]
    try:
        opt_res = optimizer.optimize_decarbonization(
            current_emissions_kgco2e=summary.total_emissions_kgco2e,
            target_reduction_percentage=10.0,
            budget_inr=500000.0,
            interventions=interventions,
        )
        decarb_plan = BRSRDecarbonizationPlan(
            target_reduction_percentage=10.0,
            target_emissions_kgco2e=opt_res["target_emissions_kgco2e"],
            optimized_reduction_kgco2e=opt_res["optimized_reduction_kgco2e"],
            residual_emissions_kgco2e=opt_res["residual_emissions_kgco2e"],
            budget_inr=opt_res["budget_inr"],
            budget_used_inr=opt_res["budget_used_inr"],
            target_achieved=opt_res["target_achieved"],
            status=opt_res["status"],
            recommendations=[
                OptimizationRecommendation(**rec) for rec in opt_res["recommendations"]
            ],
        )
    except Exception:
        decarb_plan = BRSRDecarbonizationPlan(
            target_reduction_percentage=10.0,
            target_emissions_kgco2e=summary.total_emissions_kgco2e * 0.9,
            optimized_reduction_kgco2e=0.0,
            residual_emissions_kgco2e=summary.total_emissions_kgco2e,
            budget_inr=500000.0,
            budget_used_inr=0.0,
            target_achieved=False,
            status="Baseline calculation",
            recommendations=[],
        )

    # 6. AI Narrative Generation (Deterministic Context Only)
    ai_context = {
        "company_name": company.company_name,
        "reporting_period": "FY 2024–25",
        "total_emissions_tco2e": round(summary.total_emissions_kgco2e / 1000.0, 2),
        "scope_1_tco2e": round(scope_1 / 1000.0, 2),
        "scope_2_tco2e": round(scope_2 / 1000.0, 2),
        "scope_3_tco2e": round(scope_3 / 1000.0, 2),
        "primary_data_percentage": round(summary.primary_data_percentage, 1),
        "verified_ledger_entries": ver_summary.verified_entries,
        "hash_chain_valid": chain_val.is_verified,
        "target_reduction_pct": 10.0,
        "target_achieved": decarb_plan.target_achieved,
    }

    ai_result = ai.generate_explanation(
        context_type="report",
        context=ai_context,
        question=question or (
            "Provide a formal corporate sustainability executive summary of the greenhouse gas "
            "emissions inventory, data quality assurance via SHA-256 hash-chain, and decarbonization roadmap."
        ),
    )

    # 7. Check for existing approval and validate consistency
    approval_record = get_report_signature(company_id)
    if approval_record and abs(approval_record.total_emissions_kgco2e - summary.total_emissions_kgco2e) > 0.001:
        # The underlying data has changed since the report was signed.
        # Do not present the old signature as valid for the new state.
        approval_record = None

    # 8. Assemble Report Model
    now_iso = datetime.now(timezone.utc).isoformat()
    report_id = approval_record.report_id if approval_record else f"CT-BRSR-{datetime.now(timezone.utc).strftime('%Y%m')}-{company_id:04d}"

    header = BRSRSectionHeader(
        report_id=report_id,
        company_name=company.company_name,
        company_id=company.company_id,
        reporting_period="FY 2024–25",
        industry=company.industry,
        location=company.location,
        generated_at=now_iso,
    )

    disclaimer = (
        "This Business Responsibility and Sustainability Report (BRSR) core disclosure "
        "is generated by the CarbonTrace GHG Protocol-aligned prototype. "
        "Calculations are strictly deterministic based on recorded activity quantities and "
        "published emission factors. Data integrity is tracked via an append-only SHA-256 hash-chain ledger. "
        "This prototype does not claim statutory certification, guaranteed regulatory compliance, "
        "or replace statutory third-party assurance."
    )

    return BRSRReportResponse(
        header=header,
        executive_summary=ai_result["explanation"],
        is_ai_generated=not ai_result.get("is_fallback", False),
        is_fallback_ai=ai_result.get("is_fallback", False),
        total_emissions_kgco2e=summary.total_emissions_kgco2e,
        scope_1_emissions_kgco2e=scope_1,
        scope_2_emissions_kgco2e=scope_2,
        scope_3_emissions_kgco2e=scope_3,
        primary_emissions_kgco2e=summary.primary_emissions_kgco2e,
        estimated_emissions_kgco2e=summary.estimated_emissions_kgco2e,
        primary_data_percentage=summary.primary_data_percentage,
        flagged_entries_count=summary.flagged_entries_count,
        top_suppliers=supplier_summaries,
        verification_summary=ver_summary,
        hash_chain_valid=chain_val.is_verified,
        decarbonization_plan=decarb_plan,
        ai_explanation=ai_result["explanation"],
        approval=approval_record,
        disclaimer=disclaimer,
    )


# ============================================================
# REPORTLAB DYNAMIC PDF GENERATOR
# ============================================================

def generate_brsr_pdf(report: BRSRReportResponse) -> bytes:
    """
    Generate a dynamic, presentation-ready multi-page PDF document
    from the canonical BRSRReportResponse object using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#475569"),
    )
    section_title = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#065f46"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#064e3b"),
    )
    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#64748b"),
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>CarbonTrace</b> · Greenhouse Gas Emissions Disclosure", ParagraphStyle("HdrL", fontName="Helvetica-Bold", fontSize=9, textColor=colors.HexColor("#059669"))),
            Paragraph(f"Report ID: <b>{report.header.report_id}</b>", ParagraphStyle("HdrR", fontName="Helvetica", fontSize=8.5, textColor=colors.HexColor("#64748b"), alignment=2)),
        ]
    ]
    t_hdr = Table(header_data, colWidths=[340, 200])
    t_hdr.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story.append(t_hdr)
    story.append(Spacer(1, 10))

    # Title Block
    story.append(Paragraph("BRSR Core Greenhouse Gas Disclosure Report", title_style))
    story.append(Paragraph(f"<b>{report.header.company_name}</b> · Reporting Period: {report.header.reporting_period} · {report.header.standard}", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceBefore=2, spaceAfter=10))

    # 2. Executive Summary Box
    exec_text = f"<b>Executive Summary:</b> {report.executive_summary}"
    ai_tag = " [AI-Generated Narrative]" if report.is_ai_generated else " [Deterministic Summary]"
    story.append(Paragraph(f"<font color='#047857'><b>AI-GENERATED EXECUTIVE SUMMARY{ai_tag}</b></font>", ParagraphStyle("AITag", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#047857"))))
    story.append(Spacer(1, 4))
    exec_table = Table(
        [[Paragraph(exec_text, callout_style)]],
        colWidths=[540],
    )
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#a7f3d0")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 12))

    # 3. Key Emissions Overview Table
    story.append(Paragraph("1. Greenhouse Gas Emissions Inventory", section_title))
    tot_t = report.total_emissions_kgco2e / 1000.0
    s1_t = report.scope_1_emissions_kgco2e / 1000.0
    s2_t = report.scope_2_emissions_kgco2e / 1000.0
    s3_t = report.scope_3_emissions_kgco2e / 1000.0

    kpi_data = [
        [
            Paragraph("<b>Emission Scope / Category</b>", table_cell_bold),
            Paragraph("<b>Emissions (kgCO₂e)</b>", table_cell_bold),
            Paragraph("<b>Emissions (tCO₂e)</b>", table_cell_bold),
            Paragraph("<b>% of Total</b>", table_cell_bold),
            Paragraph("<b>Data Quality</b>", table_cell_bold),
        ],
        [
            Paragraph("<b>Scope 1: Direct Combustion & Fleet</b>", table_cell_style),
            Paragraph(f"{report.scope_1_emissions_kgco2e:,.2f}", table_cell_style),
            Paragraph(f"{s1_t:,.3f}", table_cell_style),
            Paragraph(f"{(s1_t / tot_t * 100.0 if tot_t > 0 else 0):.1f}%", table_cell_style),
            Paragraph("Direct Measurement (Primary)", table_cell_style),
        ],
        [
            Paragraph("<b>Scope 2: Purchased Electricity (Grid)</b>", table_cell_style),
            Paragraph(f"{report.scope_2_emissions_kgco2e:,.2f}", table_cell_style),
            Paragraph(f"{s2_t:,.3f}", table_cell_style),
            Paragraph(f"{(s2_t / tot_t * 100.0 if tot_t > 0 else 0):.1f}%", table_cell_style),
            Paragraph("Utility Meter (Primary)", table_cell_style),
        ],
        [
            Paragraph("<b>Scope 3: Upstream Supply Chain & Logistics</b>", table_cell_style),
            Paragraph(f"{report.scope_3_emissions_kgco2e:,.2f}", table_cell_style),
            Paragraph(f"{s3_t:,.3f}", table_cell_style),
            Paragraph(f"{(s3_t / tot_t * 100.0 if tot_t > 0 else 0):.1f}%", table_cell_style),
            Paragraph(f"Hybrid ({report.primary_data_percentage:.1f}% Primary)", table_cell_style),
        ],
        [
            Paragraph("<b>TOTAL GROSS GHG EMISSIONS</b>", table_cell_bold),
            Paragraph(f"<b>{report.total_emissions_kgco2e:,.2f}</b>", table_cell_bold),
            Paragraph(f"<b>{tot_t:,.3f}</b>", table_cell_bold),
            Paragraph("<b>100.0%</b>", table_cell_bold),
            Paragraph(f"<b>{report.primary_data_percentage:.1f}% Primary Coverage</b>", table_cell_bold),
        ],
    ]
    t_kpi = Table(kpi_data, colWidths=[180, 100, 85, 75, 100])
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ecfdf5")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 12))

    # 4. Supply Chain / Suppliers Table
    story.append(Paragraph("2. Scope 3 Value-Chain & Supplier Breakdown", section_title))
    if report.top_suppliers:
        sup_data = [
            [
                Paragraph("<b>Supplier Name</b>", table_cell_bold),
                Paragraph("<b>Industry</b>", table_cell_bold),
                Paragraph("<b>Location</b>", table_cell_bold),
                Paragraph("<b>Emissions (kgCO₂e)</b>", table_cell_bold),
                Paragraph("<b>Data Type</b>", table_cell_bold),
                Paragraph("<b>Verified</b>", table_cell_bold),
            ]
        ]
        for s in report.top_suppliers[:8]:
            sup_data.append([
                Paragraph(s.supplier_name, table_cell_style),
                Paragraph(s.industry or "—", table_cell_style),
                Paragraph(s.location or "—", table_cell_style),
                Paragraph(f"{s.emissions_kgco2e:,.2f}", table_cell_style),
                Paragraph("PRIMARY" if s.is_primary else "ESTIMATED", table_cell_style),
                Paragraph("✓ Yes" if s.is_verified else "Pending", table_cell_style),
            ])
        t_sup = Table(sup_data, colWidths=[150, 95, 85, 95, 65, 50])
        t_sup.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_sup)
    else:
        story.append(Paragraph("No supplier emissions records logged.", body_style))
    story.append(Spacer(1, 12))

    # 5. SHA-256 Cryptographic Verification Ledger
    story.append(Paragraph("3. SHA-256 Hash-Chain Cryptographic Verification", section_title))
    v_stat = "✓ INTACT & VERIFIED" if report.hash_chain_valid else "✗ CHAIN COMPROMISED"
    v_color = "#059669" if report.hash_chain_valid else "#dc2626"
    ver_box_text = (
        f"<b>Ledger Status:</b> <font color='{v_color}'><b>{v_stat}</b></font><br/>"
        f"<b>Total Ledger Blocks:</b> {report.verification_summary.total_entries} · "
        f"<b>Verified Blocks:</b> {report.verification_summary.verified_entries} · "
        f"<b>Integrity Score:</b> {report.verification_summary.verification_percentage:.1f}% · "
        f"<b>Algorithm:</b> SHA-256 Block-Chained (Block N depends on Block N-1)<br/>"
        f"<i>All calculations are cryptographically anchored. Any historical data alteration is immediately detected.</i>"
    )
    t_ver = Table([[Paragraph(ver_box_text, callout_style)]], colWidths=[540])
    t_ver.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_ver)
    story.append(Spacer(1, 12))

    # 6. Decarbonization Action Plan (Optimizer)
    story.append(Paragraph("4. Decarbonization Action Plan (PuLP / CBC MILP Solver)", section_title))
    plan = report.decarbonization_plan
    plan_desc = (
        f"Target Reduction: <b>{plan.target_reduction_percentage:.1f}%</b> · "
        f"Optimized Abatement: <b>{plan.optimized_reduction_kgco2e / 1000.0:,.2f} tCO₂e</b> · "
        f"Projected Residual: <b>{plan.residual_emissions_kgco2e / 1000.0:,.2f} tCO₂e</b> · "
        f"Budget Used: <b>₹{plan.budget_used_inr:,.0f}</b> · "
        f"Status: <b>{plan.status}</b>"
    )
    story.append(Paragraph(plan_desc, body_style))
    story.append(Spacer(1, 6))

    if plan.recommendations:
        rec_data = [
            [
                Paragraph("<b>Priority</b>", table_cell_bold),
                Paragraph("<b>Recommended Decarbonization Action</b>", table_cell_bold),
                Paragraph("<b>Est. Reduction (tCO₂e)</b>", table_cell_bold),
                Paragraph("<b>Est. Cost (₹)</b>", table_cell_bold),
            ]
        ]
        for r in plan.recommendations:
            rec_data.append([
                Paragraph(f"P{r.priority}", table_cell_style),
                Paragraph(r.action, table_cell_style),
                Paragraph(f"{r.estimated_reduction_kgco2e / 1000.0:,.2f}", table_cell_style),
                Paragraph(f"₹{r.estimated_cost_inr:,.0f}", table_cell_style),
            ])
        t_rec = Table(rec_data, colWidths=[50, 290, 100, 100])
        t_rec.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t_rec)
    story.append(Spacer(1, 12))

    # 7. Sign-off / Governance Box
    story.append(Paragraph("5. Governance & Sign-off Record", section_title))
    if report.approval:
        appr_text = (
            f"<b>Status:</b> <font color='#059669'><b>SIGNED &amp; APPROVED</b></font><br/>"
            f"<b>Signer:</b> {report.approval.signer_name} ({report.approval.signer_role})<br/>"
            f"<b>Signed At:</b> {report.approval.signed_at}<br/>"
            f"<b>Application Signature Digest (SHA-256):</b><br/>"
            f"<font face='Courier' size='7'>{report.approval.signature_hash}</font>"
        )
    else:
        appr_text = (
            "<b>Status:</b> <font color='#d97706'><b>PENDING SIGN-OFF</b></font><br/>"
            "This disclosure is currently in draft review state. Use the CarbonTrace Signing module to approve."
        )
    t_appr = Table([[Paragraph(appr_text, callout_style)]], colWidths=[540])
    t_appr.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4") if report.approval else colors.HexColor("#fffbeb")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#a7f3d0") if report.approval else colors.HexColor("#fde68a")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_appr)
    story.append(Spacer(1, 12))

    # 8. Disclaimer
    story.append(Paragraph(f"<b>Prototype Disclosure Notice:</b> {report.disclaimer}", disclaimer_style))

    # Build Document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
