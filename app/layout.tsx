import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PDFProvider } from "@/components/PDFProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PDF Merger - Merge & Reorder PDF Pages",
  description: "Upload, merge, reorder, and download PDF files with an intuitive drag-and-drop interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PDFProvider>
          {children}
        </PDFProvider>
      </body>
    </html>
  );
}
