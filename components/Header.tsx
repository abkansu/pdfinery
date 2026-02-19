"use client";

import { Link, usePathname } from "@/lib/navigation";
import Image from "next/image";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Navigation");
  const { pages, isLoading, clearAll } = usePDF(); // Access PDF context

  const navItems = [
    {
      name: t("organize"),
      href: "/organize",
      isActive: pathname === "/organize"
    },
    {
      name: t("split"),
      href: "/split",
      isActive: pathname === "/split"
    },
    {
      name: t("convert"),
      href: "/convert",
      isActive: pathname === "/convert"
    },
    {
      name: t("sign"),
      href: "/sign-pdf",
      isActive: pathname === "/sign-pdf"
    },
    {
      name: t("edit"),
      href: "/edit-pdf",
      isActive: pathname === "/edit-pdf"
    },
    {
      name: t("optimize"),
      href: "/optimize",
      isActive: pathname === "/optimize"
    }
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/logos/logo.png"
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
          <LanguageSelect />
          {children}
          
          {/* Page-specific Actions */}
          {(pathname === "/organize" || pathname === "/split") && (
            <>
              {pages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAll}
                  className="gap-2 hidden sm:flex"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("clearAll")}
                </Button>
              )}
              {pathname === "/organize" && (
                <DownloadButton pages={pages} disabled={isLoading} />
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
