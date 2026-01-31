import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PDFProvider } from "@/components/PDFProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PDFinery - Merge & Reorder PDF Pages",
    template: "%s | PDFinery"
  },
  description: "Free online PDF merger. Upload, merge, reorder, and download PDF files securely in your browser. No installation required.",
  keywords: ["pdf merger", "merge pdf", "combine pdf", "pdf tool", "reorder pdf pages", "free pdf merger", "browser-based pdf tool"],
  authors: [{ name: "PDFinery" }],
  creator: "PDFinery",
  publisher: "PDFinery",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://PDFinery.com"), // Replace with your actual domain when you deploy
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PDFinery - Merge & Reorder PDF Pages",
    description: "Free online PDF merger. Upload, merge, reorder, and download PDF files securely in your browser.",
    url: "https://PDFinery.com",
    siteName: "PDFinery",
    images: [
      {
        url: "/og-image.png", // Recommended: Add a 1200x630 image to your public/ folder
        width: 1200,
        height: 630,
        alt: "PDFinery Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFinery - Merge & Reorder PDF Pages",
    description: "Free online PDF merger. Secure, fast, and easy to use.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
