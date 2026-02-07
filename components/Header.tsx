"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePDF } from "@/contexts/PDFContext";
import { DownloadButton } from "@/components/DownloadButton";
import { Trash2 } from "lucide-react";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const { pages, isLoading, clearAll } = usePDF(); // Access PDF context

  const navItems = [
    {
      name: "Organize",
      href: "/organize",
      isActive: pathname === "/organize"
    },
    {
      name: "Convert",
      href: "/convert",
      isActive: pathname === "/convert"
    },
    {
      name: "Sign & Secure",
      href: "/sign-pdf",
      isActive: pathname === "/sign-pdf"
    }
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/logo.png"
              alt="PDFinery"
              width={32}
              height={32}
              className="rounded-lg object-contain"
              priority
            />
            <span className="text-xl font-bold hidden sm:inline-block">PDFinery</span>
          </Link>

          <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-sm font-medium transition-all",
                    item.isActive 
                      ? "bg-background text-foreground shadow-sm hover:bg-background" 
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {children}
          
          {/* Page-specific Actions */}
          {pathname === "/organize" && (
            <>
              {pages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAll}
                  className="gap-2 hidden sm:flex"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              )}
              <DownloadButton pages={pages} disabled={isLoading} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
