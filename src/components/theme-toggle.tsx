"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`h-9 w-9 rounded-lg border-border bg-background hover:bg-accent text-foreground ${className || ""}`}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-stone-300" />
          <span className="sr-only">Pilih Tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32 bg-popover border-border">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer text-xs gap-2 py-2"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Terang (Light)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer text-xs gap-2 py-2"
        >
          <Moon className="h-3.5 w-3.5 text-stone-400" />
          <span>Gelap (Dark)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer text-xs gap-2 py-2"
        >
          <span className="h-3.5 w-3.5 text-center text-[10px] font-bold">💻</span>
          <span>Sistem (Auto)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
