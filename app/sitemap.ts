import type { MetadataRoute } from "next";

const baseUrl = "https://www.asianthejason.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/about",
    "/contact",
    "/ftc-teams",
    "/power-trader",
    "/privacy-policy",
    "/terms",
    "/support",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
