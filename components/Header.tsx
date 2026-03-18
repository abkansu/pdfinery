"use client";

import { Link, usePathname } from "@/lib/navigation";
import Image from "next/image";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePDF } from "@/contexts/PDFContext";
import { DownloadButton } from "@/components/DownloadButton";
import { Trash2, Github, Star } from "lucide-react";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const tProvider = useTranslations("Components.PDFProvider");
  const tCommon = useTranslations("Common");
  const { pages, isLoading, clearAll } = usePDF(); // Access PDF context
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/abkansu/pdfinery")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        } else {
          setStars(0);
        }
      })
      .catch((err) => {
        console.error("Error fetching github stars:", err);
        setStars(0);
      });
  }, []);

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
      <div className="flex items-center justify-between h-16 w-full px-4 xl:px-8 gap-4">
        <div className="flex items-center justify-start gap-4 xl:gap-8 overflow-hidden">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
            <Image
              src="/logos/logo.png"
              alt="PDFinery"
              width={32}
              height={32}
              className="rounded-lg object-contain"
              priority
            />
            <span className="text-xl font-bold hidden xl:inline-block">PDFinery</span>
          </Link>

          {/* Navigation Menu */}
          <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto no-scrollbar shrink-0 max-w-full">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="shrink-0">
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

        {/* Right: Actions, Language, and GitHub */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {children}
          
          {/* Page-specific Actions */}
          {(pathname === "/organize" || pathname === "/split") && (
            <>
              {pages.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2 hidden sm:flex"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("clearAll")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("clearAll")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {tProvider("confirmClear")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAll}>{tCommon("continue")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {pathname === "/organize" && (
                <DownloadButton pages={pages} disabled={isLoading} />
              )}
            </>
          )}

          <LanguageSelect />

          <a
            href="https://github.com/abkansu/pdfinery"
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            <Button variant="outline" size="sm" className="gap-2 h-9 px-3 hover:bg-muted">
              <Github className="h-4 w-4" />
              <span className="hidden lg:inline-block font-medium">GitHub</span>
              {stars !== null && (
                <span className="flex items-center gap-1 ml-1 pl-2 border-l border-border text-xs font-medium">
                  <Star className="h-3 w-3 fill-current" />
                  {stars}
                </span>
              )}
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
