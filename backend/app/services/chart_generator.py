from __future__ import annotations

from datetime import date
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


STATIC_DIR = Path(__file__).resolve().parents[1] / "static" / "charts"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


def generate_market_chart(rows: list[dict], report_date: date) -> str:
    """Render only verified prices and explicitly configured strategy thresholds."""
    labels: list[str] = []
    verified: list[float] = []
    trigger: list[float] = []
    strong: list[float] = []

    for row in rows:
        if row.get("verified_price") is None and row.get("trigger_price") is None:
            continue
        labels.append(str(row.get("label", "item"))[:34])
        verified.append(float(row["verified_price"]) if row.get("verified_price") is not None else 0.0)
        trigger.append(float(row["trigger_price"]) if row.get("trigger_price") is not None else 0.0)
        strong.append(float(row["strong_buy_price"]) if row.get("strong_buy_price") is not None else 0.0)

    fig_height = max(4.5, 0.75 * max(len(labels), 4))
    fig, ax = plt.subplots(figsize=(11, fig_height))
    if labels:
        y = list(range(len(labels)))
        height = 0.23
        ax.barh([value - height for value in y], verified, height=height, label="Verified checkout")
        ax.barh(y, trigger, height=height, label="Trigger")
        ax.barh([value + height for value in y], strong, height=height, label="Strong buy")
        ax.set_yticks(y, labels)
        ax.invert_yaxis()
        ax.set_xlabel("CNY")
        ax.legend(loc="lower right")
        max_value = max(verified + trigger + strong + [1])
        for row_index, value in enumerate(verified):
            if value:
                ax.text(value + max_value * 0.008, row_index - height, f"¥{value:,.0f}", va="center", fontsize=9)
    else:
        ax.text(0.5, 0.56, "今日暂无可核验好价", ha="center", va="center", fontsize=18)
        ax.text(0.5, 0.43, "No verified checkout price today", ha="center", va="center", fontsize=11)
        ax.axis("off")
    ax.set_title(f"Camera Market Strategy Report · {report_date.isoformat()}")
    fig.tight_layout()
    out = STATIC_DIR / f"market_{report_date.isoformat()}.png"
    fig.savefig(out, dpi=170, bbox_inches="tight")
    plt.close(fig)
    return f"/static/charts/{out.name}"
