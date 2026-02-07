import React from "react";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} PDFinery. Built with privacy in mind.
        </p>
      </div>
    </footer>
  );
}
