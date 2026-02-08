import React from "react";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Components.Footer");
  
  return (
    <footer className="border-t py-8 mt-auto bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}