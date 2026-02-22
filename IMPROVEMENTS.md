# PDF Utility Tool — Improvement Findings

> Generated: 2026-02-21

---

## Critical Issues (Broken Features)

### 1. Password Protection is Non-Functional
**File:** `lib/pdf-utils.ts`

The implementation only adds metadata comments — it does **not** actually encrypt the PDF. `pdf-lib` does not support encryption in the browser. Users believe their PDFs are protected, but they aren't.

**Fix options:**
- Add a server-side API route using ghostscript or qpdf for real encryption
- Or clearly relabel the feature in the UI as "metadata tagging only" to avoid misleading users

---

### 2. Text Extraction Returns Placeholder Text
**File:** `lib/pdf-utils.ts`

Returns `[Text extraction from page {i}]` instead of actual content. `pdf-lib` doesn't support text reading.

**Fix:** Use `pdfjs-dist` (already a project dependency) to extract text properly via its `getTextContent()` API.

---

### 3. Compression Rarely Reduces File Size
**File:** `lib/pdf-utils.ts`

Often produces equal or **larger** output. The code itself has a comment acknowledging this limitation. `pdf-lib` only removes unused objects — it lacks proper compression algorithms.

**Fix options:**
- Use a server-side route with ghostscript
- Or display an honest warning in the UI before the user runs compression

---

## Architecture Issues (High Impact)

### 4. `app/page.tsx` is 1,971 Lines
Every tab, every form, and every handler lives in one monolithic file. This makes it extremely hard to maintain, test, or reason about.

**Fix:** Split into tab-level components:
- `components/tabs/CreatePDFTab.tsx`
- `components/tabs/MergeTab.tsx`
- `components/tabs/CompressTab.tsx`
- `components/tabs/ConvertTab.tsx`
- `components/tabs/AeroStudioTab.tsx`
- `components/tabs/AdvancedToolsTab.tsx`

---

### 5. 14+ Scattered `useState` Calls with No Structure
State for completely unrelated features (merge, split, create, compress) all lives in one component with no separation.

**Fix:** Use `useReducer` per tab, or introduce a lightweight store like [Zustand](https://github.com/pmndrs/zustand) to scope state per feature.

---

### 6. Dependency Versions Pinned to `"latest"`
`pdf-lib`, `react-pdf`, and `pdfjs-dist` use floating `"latest"` versions, which can silently break on upstream updates.

**Fix:** Pin all dependencies to exact versions in `package.json`. Run `npm ls` to find the current resolved versions.

---

## Missing Features

| Feature | Status | Notes |
|---|---|---|
| Actual PDF encryption | Missing | Current impl is fake |
| Real text extraction | Broken | Returns placeholder text |
| Batch processing queue | Missing | One operation at a time |
| Web Workers for heavy ops | Missing | UI can freeze on large files |
| Undo/redo in AeroStudio | Missing | No history management |
| Watermarking | Missing | Not implemented |
| Annotations / form fields | Missing | pdf-lib supports basic forms |
| Recent files / session history | Missing | No persistence |

---

## Performance Issues

### No Lazy Loading for Tabs
All tab content is rendered upfront on page load. Each tab should use dynamic `import()` so only the active tab's code is loaded.

### Images Not Optimized Before PDF Embedding
Large images (PNG, JPG) are embedded raw into PDF output, inflating file sizes unnecessarily.

**Fix:** Resize and compress images to a reasonable DPI (e.g., 150 DPI for standard, 300 DPI for print) before embedding.

### Object URL Leaks in Preview Modal
**File:** `components/pdf-preview-modal.tsx`

Object URLs created for preview may not be fully revoked in all error paths.

**Fix:** Ensure `URL.revokeObjectURL()` is always called in a `finally` block or cleanup function.

### External CDN Dependency for PDF.js Worker
The PDF.js worker is loaded from `unpkg.com`. This fails silently for offline users and is a performance bottleneck.

**Fix:** Bundle the worker locally. Copy `pdfjs-dist/build/pdf.worker.min.js` to `/public` and reference it directly.

---

## Code Quality

### No Tests
Zero test coverage across the entire project. `lib/pdf-utils.ts` contains pure utility logic that is straightforward to unit test.

**Suggested tooling:** Vitest + jsdom (pairs well with Next.js/Vite)

**Priority test targets:**
- `PDFProcessor.mergePDFs()`
- `PDFProcessor.splitPDF()`
- `PDFProcessor.extractPages()`
- File validation logic in `app/page.tsx`

---

### `any` Types in Components
**File:** `components/pdf-preview-modal.tsx`

Several `any` type usages weaken type safety and hide potential bugs.

**Fix:** Define proper interfaces for PDF document objects and page data.

---

### Unused Dependencies
The following packages are installed but appear unused — remove them to reduce bundle size:

| Package | Reason |
|---|---|
| `recharts` | Imported but no chart UI visible |
| `date-fns` | Installed but not referenced in source |

Run `npx depcheck` to get a full unused dependency report.

---

## Accessibility Concerns

- Some interactive elements (file drop zones, custom buttons) may lack proper ARIA labels
- Modal focus trap should be verified for keyboard-only navigation
- Color contrast in some muted states may not meet WCAG AA standards

**Recommended:** Run `axe-core` or the Lighthouse accessibility audit against the app.

---

## Recommended Fix Priority

| Priority | Item |
|---|---|
| 1 | Fix text extraction using `pdfjs-dist` |
| 2 | Fix or clearly disable the password protection feature |
| 3 | Split `app/page.tsx` into tab components |
| 4 | Pin all dependency versions |
| 5 | Bundle PDF.js worker locally (remove CDN dependency) |
| 6 | Add Web Worker support for merge/compress |
| 7 | Remove unused `recharts` and `date-fns` |
| 8 | Add unit tests for `lib/pdf-utils.ts` |
| 9 | Fix object URL cleanup in preview modal |
| 10 | Optimize image compression before PDF embedding |