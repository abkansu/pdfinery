"use client";

import { Link } from "@/lib/navigation";
import { 
  Files, 
  RefreshCcw, 
  PenLine, 
  ShieldCheck, 
  ArrowRight,
  Layers,
  FileText,
  Scissors,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function LandingPage() {
  const t = useTranslations("HomePage");

  const tools = [
    {
      title: t("tools.organize.title"),
      description: t("tools.organize.description"),
      icon: Layers,
      href: "/organize",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("tools.split.title"),
      description: t("tools.split.description"),
      icon: Scissors,
      href: "/split",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: t("tools.convert.title"),
      description: t("tools.convert.description"),
      icon: RefreshCcw,
      href: "/convert",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: t("tools.sign.title"),
      description: t("tools.sign.description"),
      icon: PenLine,
      href: "/sign-pdf",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: t("tools.optimize.title"),
      description: t("tools.optimize.description"),
      icon: Minimize2,
      href: "/optimize",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PDFinery",
    url: "https://PDFinery.com",
    description: "Secure, client-side PDF tools. Merge, convert, and sign PDFs in your browser.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://PDFinery.com/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="container mx-auto px-4 py-16 md:py-24 flex-1 flex flex-col items-center justify-center">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-4">
            <ShieldCheck className="w-3 h-3 mr-1" />
            {t("features.clientSide")}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            {t.rich("title", {
              primary: (chunks) => <span className="text-primary">{chunks}</span>
            })}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/organize">
              <Button size="lg" className="h-12 px-8 text-base">
                {t("startMerging")}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/convert">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                {t("convertPdf")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href} className="group h-full">
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer border-muted">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <tool.icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {tool.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {tool.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Features / Benefits */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{t("features.private")}</h3>
            <p className="text-sm text-muted-foreground">{t("features.privateDesc")}</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-muted">
              <Files className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{t("features.noLimits")}</h3>
            <p className="text-sm text-muted-foreground">{t("features.noLimitsDesc")}</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 flex items-center justify-center rounded-full bg-muted">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">{t("features.free")}</h3>
            <p className="text-sm text-muted-foreground">{t("features.freeDesc")}</p>
          </div>
        </div>

        {/* SEO Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center space-y-4 mb-8">
          <h2 className="text-2xl font-bold tracking-tight">{t("why.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("why.description")}
          </p>
        </div>
      </div>
    </main>
  );
}
