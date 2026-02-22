"use client"

import { CheckCircle2, FileSpreadsheet, Merge, Minimize2, RotateCcw, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { pendingFile } from "@/lib/pending-file"

type NextStep = {
  tab: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NEXT_STEPS: Record<string, NextStep[]> = {
  merge: [
    { tab: "compress", label: "Compress it", icon: Minimize2 },
    { tab: "watermark", label: "Add Watermark", icon: Stamp },
  ],
  compress: [
    { tab: "watermark", label: "Add Watermark", icon: Stamp },
  ],
  convert: [
    { tab: "compress", label: "Compress it", icon: Minimize2 },
    { tab: "watermark", label: "Add Watermark", icon: Stamp },
  ],
  create: [
    { tab: "compress", label: "Compress it", icon: Minimize2 },
    { tab: "watermark", label: "Add Watermark", icon: Stamp },
    { tab: "merge", label: "Merge with others", icon: Merge },
  ],
  watermark: [
    { tab: "compress", label: "Compress it", icon: Minimize2 },
  ],
  advanced: [
    { tab: "compress", label: "Compress it", icon: Minimize2 },
    { tab: "watermark", label: "Add Watermark", icon: Stamp },
    { tab: "merge", label: "Merge with others", icon: Merge },
  ],
}

interface PostOperationPanelProps {
  /** The tab that produced the output — used to select relevant next steps. */
  sourceTab: string
  /** The processed PDF bytes to carry forward to the next tool. */
  pdfBytes: Uint8Array
  /** The output file name. */
  fileName: string
  /** Navigate to another tab. If omitted, next-step buttons are hidden. */
  onNavigate?: (tab: string) => void
  /** Reset this tab back to its empty state. */
  onReset: () => void
}

export function PostOperationPanel({
  sourceTab,
  pdfBytes,
  fileName,
  onNavigate,
  onReset,
}: PostOperationPanelProps) {
  const nextSteps = onNavigate ? (NEXT_STEPS[sourceTab] ?? []) : []

  const handleNextStep = (tab: string) => {
    pendingFile.set({ pdfBytes, fileName, sourceTab })
    onNavigate!(tab)
  }

  return (
    <div className="mt-4 rounded-xl border border-green-200/40 dark:border-green-800/30 bg-green-50/40 dark:bg-green-950/10 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Success indicator */}
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 shrink-0">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-semibold">Done</span>
        </div>

        {/* Divider */}
        {nextSteps.length > 0 && (
          <span className="text-muted-foreground/30 text-sm hidden sm:inline">—</span>
        )}

        {/* "What next?" label */}
        {nextSteps.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            What do you want to do next?
          </span>
        )}

        {/* Next step buttons */}
        <div className="flex flex-wrap gap-2">
          {nextSteps.map((step) => (
            <Button
              key={step.tab}
              variant="outline"
              size="sm"
              onClick={() => handleNextStep(step.tab)}
              className="gap-1.5 h-8 text-xs bg-background/60"
            >
              <step.icon className="h-3.5 w-3.5" />
              {step.label}
            </Button>
          ))}
        </div>

        {/* Start over — pushed to the right */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-1.5 h-8 text-xs text-muted-foreground ml-auto"
        >
          <RotateCcw className="h-3 w-3" />
          Start over
        </Button>
      </div>
    </div>
  )
}
