from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import require_operator
from app.database import get_db
from app.services.report_generator import ReportGenerator


router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/daily", response_model=list[schemas.DailyReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(models.DailyReport).order_by(desc(models.DailyReport.report_date), desc(models.DailyReport.id)).limit(30).all()


@router.post("/generate", response_model=schemas.DailyReportOut, dependencies=[Depends(require_operator)])
def generate_report(report_date: date | None = None, db: Session = Depends(get_db)):
    return ReportGenerator(db).generate(report_date or date.today())


@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.get(models.DailyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    filename = f"camera-market-report-{report.report_date.isoformat()}.md"
    return Response(
        content=report.markdown_content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
