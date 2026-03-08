from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, KeepTogether, ListFlowable, ListItem, PageTemplate, Paragraph, Spacer


OUTPUT_PATH = Path("/Users/mike/SourceProof/output/pdf/sourcekit-app-summary.pdf")


def build_pdf() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=0.45 * inch,
        rightMargin=0.45 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.4 * inch,
        title="SourceKit App Summary",
        author="Codex",
    )

    gap = 0.22 * inch
    frame_width = (doc.width - gap) / 2
    frames = [
        Frame(doc.leftMargin, doc.bottomMargin, frame_width, doc.height, id="left"),
        Frame(doc.leftMargin + frame_width + gap, doc.bottomMargin, frame_width, doc.height, id="right"),
    ]
    doc.addPageTemplates([PageTemplate(id="two-col", frames=frames)])

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=22,
        textColor=colors.HexColor("#111827"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=10,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=colors.HexColor("#0f766e"),
        spaceBefore=4,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.4,
        leading=10.2,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=0,
        firstLineIndent=0,
        spaceAfter=1.5,
    )

    def bullets(items: list[str]) -> ListFlowable:
        return ListFlowable(
            [
                ListItem(Paragraph(item, bullet_style), leftIndent=0)
                for item in items
            ],
            bulletType="bullet",
            start="circle",
            bulletFontName="Helvetica",
            bulletFontSize=6,
            leftIndent=10,
            bulletOffsetY=1,
        )

    def section(title: str, content) -> KeepTogether:
        items = [Paragraph(title, section_style)]
        if isinstance(content, list):
            items.extend(content)
        else:
            items.append(content)
        return KeepTogether(items)

    story = [
        Paragraph("SourceKit", title_style),
        Paragraph(
            "Repo-based one-page summary generated from evidence in `/Users/mike/SourceProof`.",
            subtitle_style,
        ),
        section(
            "What It Is",
            Paragraph(
                "SourceKit is a GitHub-centric talent sourcing app for technical recruiting. "
                "It turns role inputs into search strategy, ranked engineer matches, enrichment, and pipeline workflows grounded in open-source activity rather than self-reported profiles.",
                body_style,
            ),
        ),
        section(
            "Who It's For",
            Paragraph(
                "Primary persona: technical recruiters, talent sourcers, or hiring teams looking for software engineers through GitHub and related public-web signals.",
                body_style,
            ),
        ),
        section(
            "What It Does",
            bullets(
                [
                    "Builds sourcing strategy from a role, company, or pasted job description via the `research-role` edge function.",
                    "Searches GitHub contributors and users, then ranks candidates with AI-backed scoring and hidden-gem filtering.",
                    "Stores and replays search history, cached candidates, and result sets through Supabase-backed data models.",
                    "Supports LinkedIn enrichment, contact discovery, and AI-generated outreach from repo evidence.",
                    "Tracks candidates in a recruiting pipeline, watchlist, and bulk-action workflow from the React dashboard.",
                    "Creates and monitors Exa-backed Websets for persistent candidate collection and batch pipeline import.",
                    "Applies auth, subscription gating, and Stripe checkout for trial/pro plan usage control.",
                ],
            ),
        ),
        Spacer(1, 5),
        section(
            "How It Works",
            bullets(
                [
                    "Presentation: React 18 + TypeScript + Vite SPA (`src/App.tsx`, `src/pages/Index.tsx`) with tabs for research, results, history, pipeline, watchlist, bulk actions, websets, settings, and guide.",
                    "Auth/data access: frontend uses Supabase Auth and invokes Supabase Edge Functions with the signed-in user's access token (`src/lib/api.ts`, `src/services/websets.ts`).",
                    "AI/service layer: edge functions call Anthropic for query parsing, strategy, scoring, and outreach; GitHub APIs for contributors/profile data; Exa for search/websets; Stripe for billing.",
                    "Persistence: Supabase Postgres stores candidates cache, pipeline, outreach history, search history, watchlist items, settings, and user subscriptions (`supabase/full-schema.sql` plus migrations).",
                    "Data flow: role or JD input -> strategy generation -> GitHub/Exa retrieval -> candidate enrichment/scoring -> saved results/pipeline/websets surfaced back in the dashboard.",
                ],
            ),
        ),
        Spacer(1, 5),
        section(
            "How To Run",
            bullets(
                [
                    "Install Node.js 18+.",
                    "Run `npm install` in `/Users/mike/SourceProof`.",
                    "Copy `.env.example` to `.env` and fill Supabase, GitHub, Anthropic, Exa, and Stripe keys.",
                    "Start the app with `npm run dev`.",
                    "Not found in repo: a fully local, no-external-services setup.",
                ],
            ),
        ),
        Spacer(1, 5),
        section(
            "Evidence Notes",
            bullets(
                [
                    "Product description and startup steps are stated in `README.md`.",
                    "App shell and tab structure are visible in `src/App.tsx`, `src/pages/Index.tsx`, and `src/components/DashboardLayout.tsx`.",
                    "Backend service calls are evidenced in `src/lib/api.ts`, `src/services/websets.ts`, and `supabase/functions/*`.",
                ],
            ),
        ),
    ]

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
