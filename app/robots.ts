import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/admin/", "/api/", "/login", "/setup-username"],
    },
    sitemap: "https://filtard.vercel.app/sitemap.xml",
  };
}