from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal, init_db
from app.services.report_generator import ReportGenerator

if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        report = ReportGenerator(db).generate()
        print(report.title)
        print(report.summary)
    finally:
        db.close()
