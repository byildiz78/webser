"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const handleMenuClick = useCallback(() => {
    onMenuClick();
  }, [onMenuClick]);

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <Button variant="ghost" size="icon" onClick={handleMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}