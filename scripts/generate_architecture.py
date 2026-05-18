"""Generate system architecture diagram as PNG using matplotlib."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch


def draw_architecture():
    fig, ax = plt.subplots(1, 1, figsize=(18, 13))
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 13)
    ax.axis("off")
    fig.patch.set_facecolor("#faf8f5")
    ax.set_facecolor("#faf8f5")

    # Title
    ax.text(9, 12.5, "Storming Bastille — System Architecture",
            ha="center", va="center", fontsize=20, fontweight="bold",
            color="#1a1a2e", fontfamily="serif")

    # Colors
    c_frontend = "#e8f0fe"
    c_backend = "#fff3e0"
    c_agent = "#e8f5e9"
    c_tool = "#fce4ec"
    c_db = "#f3e5f5"
    c_api = "#fff9c4"
    c_border = "#90a4ae"

    def box(x, y, w, h, label, color, fontsize=9, sublabel=None, bold=False):
        rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.15",
                              facecolor=color, edgecolor=c_border, linewidth=1.2)
        ax.add_patch(rect)
        weight = "bold" if bold else "normal"
        ax.text(x + w/2, y + h/2 + (0.12 if sublabel else 0), label,
                ha="center", va="center", fontsize=fontsize, fontweight=weight,
                color="#1a1a2e")
        if sublabel:
            ax.text(x + w/2, y + h/2 - 0.18, sublabel,
                    ha="center", va="center", fontsize=7, color="#546e7a", style="italic")

    def arrow(x1, y1, x2, y2, label=None, color="#546e7a", style="->"):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle=style, color=color, lw=1.5))
        if label:
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            ax.text(mx, my + 0.15, label, ha="center", va="center",
                    fontsize=7, color=color, style="italic",
                    bbox=dict(boxstyle="round,pad=0.1", facecolor="white", edgecolor="none", alpha=0.8))

    # ===== User =====
    ax.text(2.5, 11.5, "User", ha="center", va="center", fontsize=12,
            fontweight="bold", color="#1a1a2e",
            bbox=dict(boxstyle="round,pad=0.3", facecolor="#e3f2fd", edgecolor=c_border))

    # ===== Frontend Section =====
    front_rect = FancyBboxPatch((0.3, 8.5), 17.4, 2.5, boxstyle="round,pad=0.2",
                                facecolor=c_frontend, edgecolor="#1565c0", linewidth=2, alpha=0.3)
    ax.add_patch(front_rect)
    ax.text(0.8, 10.7, "Frontend — Next.js 15 + React 19 + TailwindCSS v4",
            fontsize=11, fontweight="bold", color="#1565c0")

    box(0.8, 8.8, 2.8, 1.3, "SearchBox", c_frontend, sublabel="Free-text + Presets")
    box(4.0, 8.8, 2.8, 1.3, "StreamingNarrative", c_frontend, sublabel="Markdown + Sources")
    box(7.2, 8.8, 2.8, 1.3, "CausalGraph", c_frontend, sublabel="React Flow + Edit")
    box(10.4, 8.8, 2.8, 1.3, "Timeline", c_frontend, sublabel="D3.js Interactive")
    box(13.6, 8.8, 2.0, 1.3, "Sessions", c_frontend, sublabel="Save / Load")
    box(16.0, 8.8, 1.5, 1.3, "Theme", c_frontend, sublabel="Light / Dark")

    # User -> Frontend
    arrow(2.5, 11.1, 2.5, 10.3)

    # ===== SSE Connection =====
    arrow(9, 8.5, 9, 7.5, "SSE Stream (POST /api/query)", "#e65100", "->")

    # ===== Backend Section =====
    back_rect = FancyBboxPatch((0.3, 0.3), 17.4, 7.0, boxstyle="round,pad=0.2",
                                facecolor=c_backend, edgecolor="#e65100", linewidth=2, alpha=0.2)
    ax.add_patch(back_rect)
    ax.text(0.8, 7.0, "Backend — FastAPI + Python 3.12",
            fontsize=11, fontweight="bold", color="#e65100")

    # API Layer
    box(0.8, 5.8, 3.5, 0.9, "API Routes", c_api, bold=True,
        sublabel="/query  /sessions  /presets  /health")

    # Orchestrator
    box(5.0, 5.5, 3.5, 1.4, "QueryOrchestrator", "#fff3e0", fontsize=10, bold=True,
        sublabel="Pipeline: understand → research → analyze → graph")

    # Agents
    box(0.8, 3.8, 2.5, 1.2, "Historian", c_agent, bold=True,
        sublabel="Facts + Dates + Actors")
    box(3.7, 3.8, 2.5, 1.2, "CausalAnalyst", c_agent, bold=True,
        sublabel="Relationships + Scores")
    box(6.6, 3.8, 2.5, 1.2, "GraphBuilder", c_agent, bold=True,
        sublabel="React Flow Schema")
    box(9.5, 3.8, 2.5, 1.2, "SourceVerifier", c_agent, bold=True,
        sublabel="Fact-checking")
    box(12.4, 3.8, 2.5, 1.2, "FollowUpAgent", c_agent, bold=True,
        sublabel="Context Management")

    # Tools
    box(0.8, 1.8, 2.5, 1.3, "Deep Search", c_tool, bold=True,
        sublabel="DuckDuckGo + Bing")
    box(3.7, 1.8, 2.5, 1.3, "Source Fetcher", c_tool, bold=True,
        sublabel="HTML Extract + Images")
    box(6.6, 1.8, 2.5, 1.3, "TTL Cache", c_tool, bold=True,
        sublabel="30min Search Cache")

    # Claude API
    box(10.0, 1.5, 3.0, 1.5, "Claude API", "#e3f2fd", fontsize=11, bold=True,
        sublabel="Anthropic SDK\nStreaming + Tool Use")

    # Database
    box(14.0, 1.5, 3.5, 1.5, "SQLite", c_db, fontsize=11, bold=True,
        sublabel="Sessions + Queries\nGraphs + State")

    # Arrows: API -> Orchestrator
    arrow(4.3, 6.2, 5.0, 6.2, "request")

    # Orchestrator -> Agents
    arrow(6.0, 5.5, 2.0, 5.0, "parallel")
    arrow(6.5, 5.5, 5.0, 5.0, "parallel")
    arrow(7.0, 5.5, 7.8, 5.0)
    arrow(7.5, 5.5, 10.5, 5.0, "parallel")
    arrow(8.0, 5.5, 13.5, 5.0)

    # Agents -> Tools
    arrow(2.0, 3.8, 2.0, 3.1, "search")
    arrow(5.0, 3.8, 5.0, 3.1, "fetch")
    arrow(8.0, 3.8, 8.0, 3.1, "cache")

    # Agents -> Claude API
    arrow(2.0, 4.0, 10.0, 2.5, color="#1565c0")
    arrow(5.0, 4.0, 10.0, 2.3, color="#1565c0")
    arrow(8.0, 4.0, 10.5, 2.8, color="#1565c0")
    arrow(10.8, 3.8, 11.0, 3.0, color="#1565c0")

    # Orchestrator -> DB
    arrow(8.5, 5.8, 14.0, 2.8, "persist", "#7b1fa2")

    # Sessions component -> DB
    arrow(14.6, 8.8, 15.5, 3.0, "CRUD", "#7b1fa2")

    # Legend
    legend_y = 0.5
    legend_items = [
        (c_frontend, "Frontend (Next.js)"),
        (c_agent, "AI Agents"),
        (c_tool, "Search Tools"),
        (c_api, "API Layer"),
        (c_db, "Storage"),
        ("#e3f2fd", "Claude API"),
    ]
    for i, (color, label) in enumerate(legend_items):
        x = 0.8 + i * 2.8
        rect = FancyBboxPatch((x, legend_y), 0.4, 0.3, boxstyle="round,pad=0.05",
                              facecolor=color, edgecolor=c_border, linewidth=0.8)
        ax.add_patch(rect)
        ax.text(x + 0.55, legend_y + 0.15, label, fontsize=7, va="center", color="#546e7a")

    plt.tight_layout()
    output_path = "system_architecture.png"
    plt.savefig(output_path, dpi=200, bbox_inches="tight", facecolor="#faf8f5")
    plt.close()
    print(f"Architecture diagram saved to: {output_path}")


if __name__ == "__main__":
    draw_architecture()
