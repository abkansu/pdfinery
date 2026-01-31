import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://PDFinery.com";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/llms.txt", "/llm.txt", "/content.md"],
      disallow: "/api/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
