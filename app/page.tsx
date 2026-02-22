"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { PDFPreviewModal } from "@/components/pdf-preview-modal"
import { CreatePDFTab } from "@/components/tabs/CreatePDFTab"
import { MergeTab } from "@/components/tabs/MergeTab"
import { CompressTab } from "@/components/tabs/CompressTab"
import { ConvertTab } from "@/components/tabs/ConvertTab"
import { AdvancedToolsTab } from "@/components/tabs/AdvancedToolsTab"
import { AeroStudioTab } from "@/components/tabs/AeroStudioTab"
import { WatermarkTab } from "@/components/tabs/WatermarkTab"
import { BatchTab } from "@/components/tabs/BatchTab"
import { HomeScreen } from "@/components/HomeScreen"
import { FileShelf } from "@/components/FileShelf"
import { SHELF_USE_EVENT, type ShelfUseEventDetail, useFileShelf, type ShelfFile } from "@/lib/file-shelf"
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Home,
  Keyboard,
  Layers,
  LayoutGrid,
  ListTodo,
  Menu,
  Merge,
  Minimize2,
  Plus,
  Scissors,
  Stamp,
} from "lucide-react"

type PreviewParams = {
  file?: File | null
  pdfBytes?: Uint8Array | null
  fileName?: string
  title?: string
}

type NavItem = {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string | null
  items: NavItem[]
  deemphasized?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ value: "home", label: "Home", icon: Home }],
  },
  {
    label: "Organise",
    items: [
      { value: "merge", label: "Merge PDFs", icon: Merge },
      { value: "advanced", label: "Split & Extract", icon: Scissors },
    ],
  },
  {
    label: "Optimise",
    items: [
      { value: "compress", label: "Compress PDF", icon: Minimize2 },
      { value: "convert", label: "Convert to PDF", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Create",
    items: [
      { value: "create", label: "Create PDF", icon: Plus },
      { value: "studio", label: "PDF Builder", icon: LayoutGrid },
    ],
  },
  {
    label: "Annotate",
    items: [{ value: "watermark", label: "Watermark", icon: Stamp }],
  },
  {
    label: "Power Tools",
    items: [{ value: "batch", label: "Batch Process", icon: ListTodo }],
    deemphasized: true,
  },
]

// ─── Keyboard shortcuts map (⌘ + key) ────────────────────────────────────────
const SHORTCUTS: Record<string, string> = {
  home: "H",
  merge: "1",
  advanced: "2",
  compress: "3",
  convert: "4",
  create: "5",
  studio: "6",
  watermark: "7",
  batch: "8",
}

// ─── Shelf file count per tab ─────────────────────────────────────────────────
function getShelfCount(tabValue: string, shelfFiles: ShelfFile[]): number {
  switch (tabValue) {
    case "merge":
    case "advanced":
    case "compress":
    case "watermark":
      return shelfFiles.filter((f) => f.fileType === "pdf").length
    case "batch":
      return shelfFiles.length
    case "convert":
      return shelfFiles.filter((f) => f.fileType === "image" || f.fileType === "document").length
    case "create":
      return shelfFiles.filter((f) => f.fileType === "image").length
    default:
      return 0
  }
}

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
const MOBILE_PRIMARY_VALUES = ["home", "merge", "compress", "convert"]
const MOBILE_PRIMARY = MOBILE_PRIMARY_VALUES.map(
  (v) => ALL_NAV_ITEMS.find((i) => i.value === v)!
)

export default function PDFUtilityTool() {
  const [activeTab, setActiveTab] = useState("home")
  const [moreOpen, setMoreOpen] = useState(false)
  const [sidebarCollapsed, _setSidebarCollapsed] = useState(false)
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean } & PreviewParams>({
    isOpen: false,
    file: null,
    pdfBytes: null,
    fileName: "",
    title: "",
  })

  const shelfFiles = useFileShelf()

  // ── Persist sidebar collapse state ──────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("flowpdf:sidebar-collapsed")
    if (stored === "true") _setSidebarCollapsed(true)
  }, [])

  function setSidebarCollapsed(v: boolean) {
    _setSidebarCollapsed(v)
    localStorage.setItem("flowpdf:sidebar-collapsed", String(v))
  }

  const openPreview = (params: PreviewParams) => {
    setPreviewModal({ isOpen: true, ...params })
  }

  const closePreviewModal = () => {
    setPreviewModal({ isOpen: false, file: null, pdfBytes: null, fileName: "", title: "" })
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab)
    setMoreOpen(false)
  }

  // ── Listen for shelf "send to tab" events ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetTab } = (e as CustomEvent<ShelfUseEventDetail>).detail
      handleNavigate(targetTab)
    }
    window.addEventListener(SHELF_USE_EVENT, handler)
    return () => window.removeEventListener(SHELF_USE_EVENT, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keyboard shortcuts (⌘ + key) ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      const match = Object.entries(SHORTCUTS).find(
        ([, k]) => k.toLowerCase() === e.key.toLowerCase()
      )
      if (match) {
        e.preventDefault()
        setActiveTab(match[0])
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const moreIsActive = !MOBILE_PRIMARY_VALUES.includes(activeTab)

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <div className="min-h-screen bg-background text-foreground flex overflow-hidden relative font-sans">

        {/* Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="glow-orb w-[500px] h-[500px] bg-primary/20 -top-40 -left-40 animate-slow-spin" />
          <div className="glow-orb w-[400px] h-[400px] bg-flow-blue/20 bottom-10 right-10 animate-slow-spin [animation-direction:reverse]" />
          <div className="glow-orb w-[300px] h-[300px] bg-flow-indigo/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
        </div>

        {/* ── Desktop Sidebar ───────────────────────────────────────── */}
        <aside
          className={[
            "hidden md:flex flex-col sidebar-premium z-10 shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
            sidebarCollapsed ? "w-16" : "w-72",
          ].join(" ")}
        >
          {/* ── Logo ────────────────────────────────────────────────── */}
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center pt-5 pb-3 gap-2">
              <button
                onClick={() => setActiveTab("home")}
                title="FlowPDF Home"
                className="w-9 h-9 flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <img src="/logo.png" alt="FlowPDF Logo" className="w-full h-full object-contain" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5 transition-all duration-200"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between px-5 pt-7 pb-5">
              <button
                onClick={() => setActiveTab("home")}
                className="text-left group min-w-0"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <img src="/logo.png" alt="FlowPDF Logo" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-2xl font-bold flow-text-gradient tracking-tight group-hover:opacity-80 transition-opacity">
                    FlowPDF
                  </h1>
                </div>
                <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-[0.15em]">
                  Premium Suite
                </span>
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse sidebar"
                className="mt-1 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5 transition-all duration-200 flex-shrink-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Nav groups ──────────────────────────────────────────── */}
          <nav className={["flex-1 pb-4 overflow-y-auto", sidebarCollapsed ? "px-1.5" : "px-3"].join(" ")}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? "mt-4" : ""}>
                {/* Group label */}
                {group.label && (
                  sidebarCollapsed ? (
                    <div className="flex justify-center my-2">
                      <span className="h-px w-6 bg-border/40 block" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 mb-1.5">
                      <span className="h-px flex-1 bg-border/40" />
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
                        {group.label}
                      </span>
                      <span className="h-px flex-1 bg-border/40" />
                    </div>
                  )
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.value
                    const shelfCount = getShelfCount(item.value, shelfFiles)
                    const shortcut = SHORTCUTS[item.value]

                    return (
                      <button
                        key={item.value}
                        onClick={() => setActiveTab(item.value)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={[
                          "w-full flex items-center rounded-md text-sm font-semibold tracking-tight transition-all duration-200 group/item relative",
                          sidebarCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
                          isActive
                            ? "bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
                            : group.deemphasized
                              ? "text-muted-foreground/50 hover:bg-white/5 hover:text-muted-foreground"
                              : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                        ].join(" ")}
                      >
                        {/* Left active indicator pill */}
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r-md shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
                        )}

                        {/* Icon — tinted container when active */}
                        <span
                          className={[
                            "flex-shrink-0 flex items-center justify-center rounded-md transition-all duration-200",
                            isActive
                              ? "w-7 h-7 bg-primary/15 text-primary"
                              : "w-5 h-5 group-hover/item:scale-110",
                          ].join(" ")}
                        >
                          <item.icon className={isActive ? "h-[15px] w-[15px]" : "h-4 w-4"} />
                        </span>

                        {/* Label + badges + shortcut (hidden when collapsed) */}
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>

                            {/* Live shelf file count badge */}
                            {shelfCount > 0 && !isActive && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-flow-blue/15 text-flow-blue min-w-[18px] text-center leading-none">
                                {shelfCount}
                              </span>
                            )}

                            {/* Beta badge for Power Tools */}
                            {group.deemphasized && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-flow-indigo/20 text-flow-indigo uppercase tracking-wider">
                                Beta
                              </span>
                            )}

                            {/* Keyboard shortcut hint */}
                            {shortcut && !group.deemphasized && shelfCount === 0 && !isActive && (
                              <span className="text-[10px] text-muted-foreground/30 font-mono opacity-0 group-hover/item:opacity-100 transition-opacity">
                                ⌘{shortcut}
                              </span>
                            )}
                          </>
                        )}

                        {/* Collapsed: mini dot when shelf has files */}
                        {sidebarCollapsed && shelfCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-flow-blue shadow-[0_0_4px_hsl(var(--flow-blue))]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div className={["border-t border-white/5", sidebarCollapsed ? "p-3" : "p-4"].join(" ")}>
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <ThemeSwitcher />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    Appearance
                  </span>
                  <ThemeSwitcher />
                </div>
                <div className="flex items-center justify-between px-2">
                  <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors group/kbd">
                    <Keyboard className="h-3 w-3" />
                    <span>Shortcuts</span>
                    <span className="font-mono bg-muted/60 px-1 py-0.5 rounded-md text-[9px] group-hover/kbd:bg-primary/10 group-hover/kbd:text-primary transition-colors">
                      ⌘K
                    </span>
                  </button>
                  <span className="text-[9px] text-muted-foreground/25 font-mono">v1.0</span>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* ── Mobile Top Header ─────────────────────────────────────── */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-md border-b border-white/5 z-50 px-4 flex items-center justify-between">
          <button
            onClick={() => setActiveTab("home")}
            className="text-lg font-bold flow-text-gradient hover:opacity-80 transition-opacity"
          >
            FlowPDF
          </button>
          <ThemeSwitcher />
        </div>

        {/* ── Main Content ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0 bg-transparent z-10">
          <div className="container max-w-6xl mx-auto p-4 md:p-12">
            <FileShelf />
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsContent value="home" className="mt-0">
                <HomeScreen onNavigate={handleNavigate} />
              </TabsContent>
              <TabsContent value="merge" className="space-y-6 mt-0">
                <MergeTab onOpenPreview={openPreview} onNavigate={handleNavigate} />
              </TabsContent>
              <TabsContent value="compress" className="space-y-6 mt-0">
                <CompressTab onOpenPreview={openPreview} onNavigate={handleNavigate} />
              </TabsContent>
              <TabsContent value="convert" className="space-y-6 mt-0">
                <ConvertTab onOpenPreview={openPreview} onNavigate={handleNavigate} />
              </TabsContent>
              <TabsContent value="create" className="space-y-6 mt-0">
                <CreatePDFTab onOpenPreview={openPreview} />
              </TabsContent>
              <TabsContent value="studio" className="mt-0">
                <AeroStudioTab onOpenPreview={openPreview} />
              </TabsContent>
              <TabsContent value="advanced" className="space-y-6 mt-0">
                <AdvancedToolsTab onOpenPreview={openPreview} />
              </TabsContent>
              <TabsContent value="watermark" className="space-y-6 mt-0">
                <WatermarkTab onOpenPreview={openPreview} onNavigate={handleNavigate} />
              </TabsContent>
              <TabsContent value="batch" className="space-y-6 mt-0">
                <BatchTab onOpenPreview={openPreview} />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* ── Mobile Bottom Nav ─────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-md border-t border-white/5 z-50">
          <div className="flex h-full">
            {MOBILE_PRIMARY.map((item) => {
              const isActive = activeTab === item.value
              return (
                <button
                  key={item.value}
                  onClick={() => handleNavigate(item.value)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <item.icon
                    className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""
                      }`}
                  />
                  <span className="text-[10px] font-semibold">
                    {item.label.split(" ")[0]}
                  </span>
                </button>
              )
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${moreIsActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Menu
                className={`h-5 w-5 transition-transform duration-200 ${moreIsActive ? "scale-110" : ""
                  }`}
              />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </div>
        </div>

        {/* ── Mobile "More" Sheet ───────────────────────────────────── */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto">
            <SheetHeader className="mb-5">
              <SheetTitle className="text-left text-base">All Tools</SheetTitle>
            </SheetHeader>
            <div className="space-y-5">
              {NAV_GROUPS.filter((g) => g.label !== null).map((group, gi) => (
                <div key={gi}>
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.25em] mb-2">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.value
                      return (
                        <button
                          key={item.value}
                          onClick={() => handleNavigate(item.value)}
                          className={[
                            "flex items-center gap-3 p-3 rounded-xl text-sm font-semibold text-left transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/40 text-foreground hover:bg-muted/70",
                            group.deemphasized ? "opacity-60" : "",
                          ].join(" ")}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

      </div>

      <PDFPreviewModal
        key={
          previewModal.pdfBytes
            ? `pdf-${previewModal.fileName}-${previewModal.pdfBytes.length}`
            : `file-${previewModal.file?.name}-${previewModal.file?.size}`
        }
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        file={previewModal.file}
        pdfBytes={previewModal.pdfBytes}
        fileName={previewModal.fileName}
        title={previewModal.title}
      />
    </ThemeProvider>
  )
}
