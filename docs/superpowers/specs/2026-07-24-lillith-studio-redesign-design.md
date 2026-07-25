# Lillith Writing Studio — Redesign Design Spec

- **Date:** 2026-07-24
- **Status:** Draft for review
- **Author:** Sethalos + Claude (brainstorming session)

---

## 1. Vision

Lillith Writing Studio becomes the user's **primary writing cockpit — a desktop app that replaces the Claude web chat** for novel writing. Its job is to combine three things the browser workflow can't:

1. **A real AI chat** to write and brainstorm with (Claude via API, or other LLMs).
2. **A durable, structured story bible** — characters, world, arcs, timeline — that the AI always has in context, so the user never re-uploads or re-explains a project.
3. **An Obsidian-native vault** where all of the above lives as plain markdown, so the user's notes, links, and graph "just work" with zero integration.

The guiding reframe: *the user's ten-year problem is a memory problem, not a software problem.* The app's value is **structure + persistence + easy AI access**, not a re-implementation of the model's intelligence.

The previous build over-engineered this into an AI writing IDE (SQLite source of truth, revision pipelines, publishing gates, semantic retrieval, tracked-proposal machinery, ~30 nav items). This redesign is **primarily subtractive**: strip that down to an easy, informative cockpit, then add the few genuinely new pieces (Canon Capture automation, the Dialogue Tool, a phased Publishing kit).

## 2. Goals & non-goals

**Goals**
- Easy to use and informative — a 13-destination app that feels like a 1-tab app.
- Chat-first writing that replaces the Claude web app.
- Markdown/Obsidian vault as the single source of truth.
- Automated-but-controlled canon capture from writing and chat.
- Seamless switching across **many** projects/series.
- Per-task model routing (arc, dialogue/tone, editor, image).
- End-of-draft Dialogue Tool.
- Phased Publishing/Marketing kit (Kindle EPUB → AI artwork → marketing copy).

**Non-goals**
- Revision pipelines, resumable pass queues, publishing "compliance gates."
- Semantic/FTS embedding index (the AI reads files directly; Obsidian search covers the rest).
- Cross-book "series pack" export/import machinery.
- Tracked accept/reject proposal system and inline comments subsystem.
- SQLite as source of truth.
- Being a full production-typesetting suite beyond Kindle-ready output.

## 3. Architecture overview

- **Shell/UI:** Keep **Tauri + React** and the existing component patterns. Reuse the **provider adapters** (Anthropic / Gemini / OpenAI / OpenAI-compatible / local) and **OS-keyring** credential storage.
- **Source of truth:** **Plain markdown files in an Obsidian vault.** Manuscript chapters and every canon note are markdown; the app reads/writes them directly.
- **History/undo:** **git** on the vault. Auto-commit at natural checkpoints (see §12). Replaces the old SQLite revision-precondition safety.
- **Rust backend shrinks to:** vault file I/O, provider calls, EPUB export, image generation, keyring. The 835-line SQLite repository and the one-way Obsidian sync engine are removed.
- **AI safety principle (carried forward and enforced):** AI may freely **add/update canon notes** (additive, git-revertible) but must **never silently overwrite manuscript prose.** Prose changes are always explicit user actions. This closes the safety regression identified in the code review.

## 4. Vault layout

One vault holds the user's entire writing life. Obsidian is pointed at the vault root; nothing else is required.

```
MyWritingVault/                    ← point Obsidian here
├── CLAUDE.md                      ← global context (loads first)
├── craft/                         ← principles shared across ALL projects
│   ├── revision-process.md
│   └── voice-principles.md
├── projects/
│   ├── hollow-hills/              ← a series
│   │   ├── project.md             ← genre, POV, tense, target, status, series info
│   │   ├── CLAUDE.md              ← this world's rules (loads on switch)
│   │   ├── book-1/
│   │   │   └── manuscript/
│   │   │       ├── 01-the-price.md
│   │   │       └── 02-....md
│   │   ├── characters/
│   │   │   └── david-chen.md
│   │   ├── world/
│   │   │   └── highland-annex.md
│   │   ├── timeline.md
│   │   ├── arcs.md
│   │   ├── research/
│   │   ├── tasks.md
│   │   ├── chats/                 ← named chat threads (one file per thread)
│   │   └── publish/               ← generated EPUB, artwork, listing copy
│   └── nightglass/                ← a standalone book (same shape, no book-N nesting)
└── .lillith/                      ← app-managed, NOT canon
    └── project-state.json         ← last-open view per project, watermarks, etc.
```

- **Standalone vs. series:** a series nests `book-1/`, `book-2/` under it; a standalone book puts `manuscript/` directly under the project. Same structure otherwise.
- **App config (model routing, keys, settings) lives OUTSIDE the vault** in the app config dir; API keys remain in the OS keyring. The vault stays pure, portable, and shareable without secrets.

## 5. Navigation & screens

Left sidebar, grouped, 13 destinations:

**WORKFLOW**
- **Dashboard** — current work, story-health/AI insights, active characters, timeline snapshot, tasks, Canon-activity feed, and the **Update Story Bible** button.
- **Tasks & Goals** — shared list; user *and* Claude add items.

**WRITE**
- **Lillith's Studio** — full-width chat (Claude-web replacement) for drafting, story-building, and thinking with Lillith; named threads and Save-to-canon actions.
- **Manuscript** — the live copy of the story; where you and Lillith read, edit, rewrite, and copy/paste the actual prose. Optional inline "improve this line" dialogue action.

**STORY BIBLE**
- **Characters** — basic cards + Claude-drafted voice direction.
- **World** — locations, organizations, items, worldbuilding in one browsable area.
- **Timeline** — story events.
- **Arcs** — arcs / story threads (light planning).
- **Research** — reference lookups.

**PRODUCE**
- **Dialogue Tool** — end-of-draft dialogue sweep.
- **Publishing** — Kindle EPUB + AI artwork + marketing copy (phased).

**SYSTEM**
- **Models** — per-task routing + keys.
- **Settings** — project/vault location, backups & snapshots, Canon-Capture mode toggle.

**Top bar:** project/series switcher, Ctrl+K quick-switch, active-model indicator, global search, and an always-reachable **Update Story Bible** button.

## 6. Core subsystems

### 6.1 Lillith's Studio (chat)
- Full-width chat page — the space for **drafting, story-building, brainstorming, and thinking with Lillith**. Drafted prose lands in the **Manuscript** view (§6.2) via an explicit insert.
- **Named threads per project** (Claude-web-like sidebar): "Book 3 brainstorm," "Ch. 14 rewrite," etc. Each thread persists as a markdown file under `chats/`.
- Uses the **per-task model routing** (§6.9) — e.g. a "brainstorm/structure" thread routes to the arc model; a "dialogue" thread to the dialogue/tone model. Default model per thread, overridable.
- **Save-to-canon actions** on any message: one click files content into Character / World / Timeline / Task / Note. This is the manual complement to automated Canon Capture.
- Attachments and long context supported (reuse existing chat plumbing).
- **Prose safety:** if the user asks Lillith to write/revise prose, the result appears in chat; inserting it into the manuscript is an **explicit user action** (an "Insert into chapter" / "Replace selection" button), never automatic.

### 6.2 Manuscript (the live story)
- Holds the **current copy of the story** — the actual manuscript. This is where the user **re-reads chapter 1, revises it, rewrites, copies/pastes, and works the prose** as the book develops.
- **Collaboratively editable by user and Lillith:** the user edits directly; Lillith can also edit within the manuscript through **user-initiated** actions (select text → instruct, or the inline "improve this line"). Edits apply inline and are captured in git for undo.
- **Division of labor:** *Lillith's Studio* (§6.1) is for drafting, story-building, and thinking; the **Manuscript** is the live book those ideas land in. Moving drafted prose from chat into the manuscript is an explicit action.
- **Prose safety:** every prose edit — the user's or Lillith's — is **user-initiated and visible**; no background/automatic process (including Canon Capture, §6.3) ever rewrites manuscript prose. Canon Capture only *reads* the manuscript to update canon notes.
- Chapters are markdown files under `manuscript/`; the editor loads one chapter/scene at a time.

### 6.3 Canon Capture ("Update Story Bible")
- **Trigger (default manual):** the **Update Story Bible** button, or telling Claude in chat ("update the vault / save today's canon"). Runs the pass over everything new since the last run.
- **Optional automatic mode** (Settings toggle): run on chapter save + after idle, whichever first; skip if little changed. Same engine.
- **Efficiency:** *diff, don't re-read* — a per-source watermark (content hash) means only new/changed text is sent to the model. Cost scales with what was just written, not book length.
- **Model:** a dedicated cheap/local "memory/indexing" routing slot; never the expensive arc model.
- **What it does:** extracts entities/facts from new prose and chat, then **creates or updates** the corresponding markdown notes (characters, world, timeline events), filling frontmatter and cross-linking with `[[wiki-links]]`. Existing entities are matched to avoid duplicates (entity resolution against current notes).
- **Trust/confirmation:** ships with a **preview/gated mode** — shows what it *would* write before writing. A Settings toggle flips it to **auto-write** once trusted. Either way, a **Canon-activity feed** on the dashboard logs every change and git makes any bad/duplicate entry one-click revertible.
- **Reliability caveat (documented):** entity resolution won't be perfect ("Shiela" vs "Sheila"); the preview mode and easy revert are the mitigations.

### 6.4 Characters
- **Basic, readable card:** name, aliases, role (major/supporting/minor), one-line story role, appearance, a few key traits, relationships (as `[[links]]`), notes.
- **Voice direction field:** how they speak (formality, rhythm, vocabulary, verbal tics, 1–2 good/bad example lines). **Claude drafts it** from the character's existing dialogue on demand; user approves/edits. This is the trimmed-down survivor of the old "Voice Lock" and the standard the Dialogue Tool measures against.
- Stored as one markdown file per character with YAML frontmatter + a prose body.

### 6.5 World / Timeline / Arcs / Research
- **World:** one browsable list across types (location, organization, item, worldbuilding/other), each a markdown note with a `type` field and frontmatter facts. Filter by type; no separate tab per type.
- **Timeline:** story events with order/story-time, participants (`[[links]]`), optional manuscript link. Rendered as an ordered list/timeline; stored in `timeline.md` (or a `timeline/` folder if it grows).
- **Arcs:** character/plot arcs and threads — light planning notes, not a heavy engine.
- **Research:** reference sources (web/book/note) with excerpts, notes, tags, and links to relevant chapters. Full-text handled by app search + Obsidian.

### 6.6 Tasks & Goals
- A **shared to-do** both the user and Claude write to (`tasks.md`). Claude can add items from chat ("noted — I'll flag: revise the elevator scene").
- Items have text, optional due/priority, optional link to a chapter/character, and open/done state.
- Surfaced on the Dashboard.

### 6.7 Dashboard & AI insights
- Overview of the active project: what you're working on, word count/progress, writing streak, last written.
- **Story-health / AI insights (lightweight):** pacing notes, dialogue issues, continuity flags, unresolved threads — surfaced as short advisory cards, generated on demand or refreshed with the editor model. **Not** standalone engines; they are AI passes summarized here.
- **Active characters**, **timeline snapshot**, **tasks**, **Canon-activity feed**, and the **Update Story Bible** button.

### 6.8 Dialogue Tool
- **Dedicated tool; primary mode is an end-of-draft sweep.** Runs across the whole book, a chapter, or per character.
- For each line of dialogue, compares against that character's **voice direction** (§6.4) using the **Dialogue/Tone model** and proposes improvements.
- **Output/review:** results listed as before → suggested-after pairs with the reasoning; user **accepts (applies to manuscript), edits, or rejects** per line. Applying is explicit (prose-safety principle). *(Default flagged for review: accept/reject per-line UI; batch-accept optional.)*
- **Optional inline mode:** an "improve this line" action in the Manuscript editor for in-the-moment fixes, same engine.

### 6.9 Models (per-task routing)
- Reuse the existing provider/routing system, presented simply. Task slots:
  - **Arc / structure / world-building**
  - **Dialogue / tone**
  - **Editor / review** (insights, continuity)
  - **Image** (covers, maps)
  - **Memory / indexing** (Canon Capture — cheap/local)
- Each slot maps to a configured provider+model. Remote keys in the OS keyring. Routing config is **global** (shared across projects) with optional per-project override.

### 6.10 Publishing / Marketing (phased)
Full "publish kit," delivered in phases:
- **Phase A — Kindle EPUB:** assemble a Kindle-ready EPUB from manuscript order + front/back matter. Reuses the existing Python document worker / EPUB export.
- **Phase B — AI artwork:** generate cover concepts and maps via the **image model**, saved into `publish/`. *(Default flagged: which image API/provider — TBD at build time based on the user's chosen image model.)*
- **Phase C — Marketing copy:** draft the Amazon listing — blurb, long description, keywords, categories, back-cover copy — via the editor model.
- Output lands in `projects/<project>/publish/` as files (EPUB + images + `listing.md`).

## 7. Data model (markdown conventions)

Every canon note is a markdown file with **YAML frontmatter** (machine-readable) + a **prose body** (human/Obsidian-readable). Example character:

```markdown
---
type: character
name: David Chen
aliases: []
role: major
story_role: reluctant heir
home: "[[Peekaboo]]"
appearance: Tall, perpetually tired eyes, wears his father's coat.
traits: [guarded, loyal, dry-humored]
voice_direction:
  formality: mid-low
  rhythm: clipped, fragments under stress
  vocabulary: plain, avoids profanity
  tics: ["answers questions with questions"]
  examples_good: ["\"And if I don't?\""]
  examples_bad: ["\"I am extraordinarily displeased by this turn of events.\""]
updated: 2026-07-24
---

Freeform notes about David that Obsidian shows nicely and Claude reads as context.
```

- **Wiki-links** (`[[Peekaboo]]`) are the relationship mechanism — free in Obsidian, parseable by the app.
- Frontmatter is the contract between the app and the files; the app tolerates hand-edits and missing fields (progressive enrichment).
- `CLAUDE.md` files are **assembled** from these notes so the AI always has current, compact context (with `@`-style imports of key canon).

## 8. Multi-project switching

- **Top-bar switcher + Ctrl+K quick-switch;** switching is instant (read a different folder, no DB load).
- **Per project:** manuscript, canon, chat threads, tasks, assembled context, and last-open view (resume where you left off, stored in `.lillith/project-state.json`).
- **Shared once:** model routing + keys, app settings, and the `craft/` folder of cross-project writing principles.
- **New Project** scaffolds the full folder structure and drops the user into a blank first chapter.

## 9. What we remove (from the current app)

SQLite repository as source of truth; one-way Obsidian sync engine; revision pipelines + resumable queues; semantic/FTS/embedding index; series pack export/import; tracked accept/reject proposal machinery; inline comments; publishing "compliance gate"; the heavy standalone Analysis/Pacing/Continuity engines (their *insights* survive as dashboard AI passes); the ~30-item nav.

## 10. What we reuse

Tauri shell + React component patterns; provider adapters (Anthropic/Gemini/OpenAI/compatible/local) + token-usage normalization; OS-keyring credential storage; per-task model routing concept; character/timeline/world domain types (trimmed); the Python EPUB export worker; the dashboard concept and layout; the character voice logic (trimmed to "voice direction").

## 11. Cross-cutting concerns

- **History & backups:** git on the vault; auto-commit on Update Story Bible, daily close, and before a Dialogue Tool run. Manual "Snapshot now" in Settings. Any change is revertible.
- **Prose safety:** no *background/automatic* manuscript overwrites — ever; all prose edits (user or Lillith) are user-initiated and git-tracked. Canon writes are additive and revertible.
- **Privacy:** remote calls only for explicitly configured tasks; Canon Capture defaults to manual and can be pointed at a local model so text need not leave the machine. Keys never enter the vault or exports.
- **Performance:** large manuscripts load per-chapter; Canon Capture is diffed; disk I/O is negligible; AI cost is the only meaningful cost and is minimized by diffing + cheap/local routing.

## 12. Suggestions accepted this session

Named chat threads per project; global Ctrl+K jump; auto-commit git checkpoints; Canon Capture preview/trust period; one-click New Project scaffold.

## 13. Flagged defaults / open questions (for build time)

1. **Image provider** for Publishing Phase B — depends on which image model the user chooses; adapter TBD.
2. **Dialogue Tool review UI** — default is per-line accept/edit/reject with optional batch-accept; confirm during that phase.
3. **Timeline storage** — single `timeline.md` vs. `timeline/` folder once events grow; start single-file.
4. **Manuscript format** — markdown chapters (Obsidian-native); confirm no rich-text feature from the old HTML editor is a hard requirement.
5. **Existing sample project** — migrate or archive the current SQLite sample; likely archive, start fresh vault.

## 14. Phased build order (subtractive first)

1. **Strip & re-base storage:** remove SQLite-as-truth and the sync engine; introduce the vault file layer + git history; get manuscript + basic canon reading/writing markdown. App still runs, far smaller.
2. **Cockpit shell:** the 13-item nav, project switcher, Dashboard, resume-where-you-left-off.
3. **Lillith's Studio (chat):** named threads, model routing, Save-to-canon, explicit prose insertion.
4. **Canon Capture:** diffed extraction, preview/gated mode, Canon-activity feed, Update Story Bible button + chat command.
5. **Story bible views:** Characters (+voice direction), World, Timeline, Arcs, Research, Tasks & Goals.
6. **Dialogue Tool:** end-of-draft sweep + optional inline.
7. **Publishing:** Phase A EPUB → B artwork → C marketing copy.
8. **Polish:** Ctrl+K, insights cards, settings, backups UI, and the refreshed theme (§15).

Each phase is independently usable; we review at each boundary.

## 15. Visual design direction

The app name stays **Lillith Writing Studio**, and the chat surface is **Lillith's Studio**. The current UI is a competent dark command-center; the redesign keeps that professional feel but adds **more color and polish** — a refined palette (deep base, a warm signature accent, and distinct per-status colors for insights and canon activity), clearer type hierarchy, comfortable reading measures in the Manuscript and chat, and consistent iconography. A dedicated design pass (frontend-design) produces the theme during the Polish phase.

## 16. Confirmed workflow spine & scope (added 2026-07-25)

**"Simple" means the front-end experience is effortless — NOT that the architecture or feature set is minimal.** The full editorial-intelligence system is IN scope. The app is organized as the user's actual writing workflow, walked like a spine ("where am I, what's the one obvious next thing"):

1. **Brainstorm & Structure** — Lillith's Studio (chat): arcs, chapter foundations, titles.
2. **Draft** — write chapter-by-chapter in chat; a finished chapter is *placed into* the Manuscript window (re-read / edit / tighten dialogue / research / copy-paste there).
3. **Editorial Review** (its own phase) — three **audit-only** engines, in order: **Dialogue Voice → Atmosphere Calibration → Author Polish**. They detect/analyse/explain/propose/preview and apply only author-approved changes; they never silently rewrite prose or canon; findings carry stable IDs, definite-vs-uncertain classification, and decision history; rejected findings are suppressed until the source materially changes.
4. **Manuscript Production** — formatting, cover + interior art (maps/creatures/diagrams via the image model), foreword/acknowledgement, back-cover blurb + art.
5. **Publishing** — Kindle first, expandable.
6. **Marketing / Advertising.**

The three engines and their **shared canon / character-voice / scene / findings layer with stable frontmatter IDs** are adopted from a pasted editorial-intelligence spec ("ignore the source, embrace the idea"). Because the vault is authoritative, that spec's two-store DB↔Obsidian sync collapses into **one store** (vault notes with stable IDs) + **git** versioning/backups — satisfying its safety and Obsidian goals natively. Dashboard info-panels ("Act II Ch 3 — Reanna meets Illythia…", character side-cards) are **fluff/nice-to-have, not canon**.

**Build order follows the workflow:** foundation (vault storage — done) → daily drafting loop (open project → chat → chapter lands in Manuscript → canon capture) → editorial engines (needs the shared canon + stable-manuscript-addressing foundation) → production → publishing → marketing.
