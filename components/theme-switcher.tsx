"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Sun, Moon } from "lucide-react"

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 opacity-50">
        <Sun className="h-4 w-4" />
        <Switch disabled />
        <Moon className="h-4 w-4" />
      </div>
    )
  }

  const isDark = theme === "dark"

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4" />
      <Switch 
        checked={isDark} 
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
      />
      <Moon className="h-4 w-4" />
    </div>
  )
}
