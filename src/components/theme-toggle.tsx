import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="主题切换"
      className="flex items-center gap-0.5 rounded-2xl border bg-muted/40 p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          aria-pressed={theme === value}
          className={cn(
            "rounded-xl",
            theme === value && "bg-background text-foreground shadow-xs hover:bg-background"
          )}
          onPress={() => setTheme(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  )
}
