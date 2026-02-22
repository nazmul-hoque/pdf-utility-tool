# FlowPDF — UI/UX Redesign Plan

> Created: 2026-02-21
> Status: Planning

---

## Current State Assessment

### What's Working
- Glassmorphism aesthetic is modern and visually appealing
- Dark/light theme support is solid
- Drag-and-drop is intuitive
- Icon + label sidebar is readable

### Critical UX Problems

#### 1. Information Architecture is feature-centric, not user-centric
8 flat tabs side-by-side forces users to scan everything to find what they need. Users think in tasks ("I want to make this PDF smaller"), not tools ("I want to use Compress").

#### 2. Repetitive DropZones everywhere
Every tab has its own file upload. This breaks the mental model — users don't understand why they keep "starting over." There is no persistent file context.

#### 3. No progressive disclosure
Simple tasks (compress a PDF) and complex tasks (AeroStudio canvas editor) live at the same visual level. Complexity isn't hidden until needed.

#### 4. Broken features with honest-looking UI
Password protection renders fully functional UI that doesn't actually protect anything. This is a trust violation — the most dangerous UX problem in the app.

#### 5. No workflow chaining
After merging, the user cannot immediately compress the result. Every operation is a dead end.

#### 6. Zero onboarding or empty states
The app opens to a blank interface. First-time users have no idea where to start.

---

## Redesign Strategy

### Phase 1 — Trust & Honesty (Critical)
**Impact: Critical — avoids user harm**

- [x] Remove password protection from UI — input disabled, button grayed (N/A badge), Process button disabled for this operation
- [x] Add honest size comparison to Compress — original vs compressed, %, colour-coded with warning if file grew
- [x] Label Text Extraction as Beta with caveat: "Text-based PDFs only — scanned/image PDFs will show no content"
- [x] Audit all features and add status badges: Beta (Extract Text), N/A (Add Password)

---

### Phase 2 — Home Screen (High Impact)
**Impact: High — reduces first-time confusion**

Replace the blank initial state with a guided home screen using large action cards.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     What do you want to do?                         │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  📄 Merge PDFs  │  │  ✂️ Split PDF   │  │  🗜 Compress    │    │
│  │  Combine files  │  │  Extract pages  │  │  Reduce size    │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  🔄 Convert     │  │  💧 Watermark   │  │  🎨 Create PDF  │    │
│  │  Word, Excel... │  │  Brand files    │  │  From scratch   │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│                    ── or drag files here ──                         │
└─────────────────────────────────────────────────────────────────────┘
```

- [x] Build `HomeScreen` component with 6 action cards grid (Merge, Split, Compress, Convert, Watermark, Create)
- [x] Implement drop-files-first flow: drop files → detect type → highlight relevant tool cards as "Suggested"
- [x] Add "Jump back in" recent tools section (localStorage, last 3 tools)
- [x] Wire Home as the default landing tab in page.tsx (replaces blank Create tab on load)
- [x] Separate Home visually in sidebar with a divider above the tool list
- [x] Mobile: tapping the FlowPDF logo returns to Home

---

### Phase 3 — Information Architecture Restructure (High Impact)
**Impact: High — reduces cognitive load**

Regroup from 8 flat tabs to 4-5 meaningful task categories.

**Current (feature-centric):**
```
Create | Merge | Compress | Convert | Advanced | Studio | Watermark | Batch
```

**Proposed (task-centric):**
```
Organize   →  Merge, Split, Reorder pages, Extract pages
Optimize   →  Compress, Convert format
Annotate   →  Watermark (remove fake encryption until real)
Create     →  Create from images/text, AeroStudio
Batch      →  Power user section, visually de-emphasized
```

- [x] Redesign sidebar into labelled category groups: Organise, Optimise, Create, Annotate, Power Tools
- [x] Replace Tabs/TabsTrigger sidebar with plain buttons — full layout control, category labels between groups
- [x] Mobile: fixed bottom nav bar with Home, Merge, Compress, Convert + "More" button
- [x] Mobile "More" opens a bottom Sheet listing all tool groups with category labels
- [x] Rename "AeroStudio" → "PDF Builder" in nav label, CardTitle, and internal alert strings
- [x] De-emphasize Batch — rendered at 50% opacity under a "Power Tools" section label

---

### Phase 4 — Workflow Chaining (Medium Impact)
**Impact: Medium — increases engagement and usefulness**

After any operation completes, show a contextual "what next?" panel.

```
✅ Merge complete — output.pdf (2.4 MB)

What do you want to do next?
[ Compress it ]  [ Add Watermark ]  [ Download ]  [ Start over ]
```

- [x] Build `PostOperationPanel` component — compact green bar with ✅ Done + "What next?" buttons + Start over
- [x] Map each tool to relevant next steps: merge→compress/watermark, compress→watermark, convert→compress/watermark, watermark→compress, create/advanced→compress/watermark/merge
- [x] `lib/pending-file.ts` singleton store — source tab calls `.set()`, destination tab calls `.consume()` on mount
- [x] Pending file consumption added to CompressTab and WatermarkTab (auto-populates from any previous tab)
- [x] PostOperationPanel added to Merge, Compress, Convert, Watermark tabs
- [x] `onNavigate` wired from page.tsx → all 4 tabs so "next step" buttons can change the active tab

---

### Phase 5 — Persistent File Shelf (Medium Impact)
**Impact: Medium — eliminates repetitive uploads**

Replace per-tab DropZones with a shared file context that persists across tool switches.

```
┌─────────────────────────────────────────────────────────┐
│  MY FILES                                    [+ Add]     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ doc1.pdf │  │ doc2.pdf │  │ img1.jpg │              │
│  │  3 pages │  │ 12 pages │  │  2.3 MB  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

- [x] Create global file store (`lib/file-shelf.ts` — module singleton + pub/sub + CustomEvent dispatcher)
- [x] Build persistent `FileShelf` component above main content (collapsible strip with per-file action pills)
- [x] Each tool selects from the shelf via action pills — dispatches `SHELF_USE_EVENT` → tab pre-populates + navigates
- [x] Files persist within session (cleared on page refresh)
- [x] Auto-register uploads in MergeTab, CompressTab, WatermarkTab via `fileShelf.add()`
- [x] SHELF_USE_EVENT listeners in page.tsx (navigation) + MergeTab, CompressTab, WatermarkTab (file population)

---

### Phase 6 — Mobile Layout Rethink (Medium Impact)
**Impact: Medium — expands audience**

Current mobile experience: 8-tab horizontal scroll header — difficult to use.

- [x] Replace header nav with bottom sheet / drawer navigation (done in Phase 3 — bottom bar + "More" Sheet)
- [x] Ensure toolbar tap targets ≥ 36px — preview toolbar buttons now `h-9 w-9` icons
- [x] File operations one-at-a-time on mobile — Compress/Watermark/Convert already accept single files; Merge stacks; acceptable
- [x] Make PDF preview full-screen on mobile — DialogContent is `h-dvh max-w-full` on mobile, modal on sm+; toolbar wraps; header compressed

---

### Phase 7 — Progressive Disclosure (Polish)
**Impact: Low — improves advanced user experience**

Currently, all advanced options (watermark opacity, rotation degrees, page ranges) are visible upfront.

```
[Basic settings visible by default]
     ↓
[ + Advanced options ]   ← collapsed accordion
     ↓
[Opacity, font, rotation, page range...]
```

- [x] Wrap advanced appearance settings (opacity, rotation, colour) in collapsible section in WatermarkTab — collapsed by default
- [x] Collapsed trigger shows a live summary chip (e.g. "30% · 45° · Gray") so users see current values without opening
- [x] Text + Font Size remain always visible (the essential settings); appearance options are progressive

---

## Layout Redesign

### Current Layout
- Fixed left sidebar always visible
- All 8 tabs always listed
- Main content area with per-tab DropZones

### Proposed Layout
- **Top command bar**: App name, search, recent files, theme toggle
- **Contextual sidebar**: Collapses when a tool is active, expands for navigation
- **Center stage**: Focused tool UI, no visual noise from other tools
- **Results tray at bottom**: Downloads queue visible but not intrusive

Reference patterns: Figma, Canva, Adobe Express — workspace adapts to current task.

---

## Core Design Philosophy Shift

> **From "here are our 8 tools"**
> **→ To "what are you trying to accomplish?"**

The glassmorphism aesthetic is worth keeping — it's modern and differentiating. The deeper structural issues are:
1. Information architecture
2. Missing persistent file context
3. Broken feature UX / trust signals
4. Absence of any guided user journey

---

## Progress Tracker

| Phase | Description | Priority | Status |
|-------|-------------|----------|--------|
| 1 | Trust & Honesty — badge/remove broken features | Critical | ✅ Done |
| 2 | Home Screen — guided landing with action cards | High | ✅ Done |
| 3 | IA Restructure — regroup tabs into task categories | High | ✅ Done |
| 4 | Workflow Chaining — post-operation "what next?" | Medium | ✅ Done |
| 5 | Persistent File Shelf — shared file context | Medium | ✅ Done |
| 6 | Mobile Layout — bottom nav + simplified mobile UX | Medium | ✅ Done |
| 7 | Progressive Disclosure — collapse advanced settings | Low | ✅ Done |
