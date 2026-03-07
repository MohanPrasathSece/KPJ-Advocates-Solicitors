function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function requiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

function xmlEscape(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

exports.handler = async () => {
  try {
    const SITE_URL = normalizeBaseUrl(requiredEnv("SITE_URL"));

    // Keep this aligned with react-router-dom routes.
    const routes = ["/", "/practice-areas", "/about", "/services", "/contact"];

    const now = new Date().toISOString();

    const urlset = routes
      .map((path) => {
        const loc = `${SITE_URL}${path}`;
        return [
          "  <url>",
          `    <loc>${xmlEscape(loc)}</loc>`,
          `    <lastmod>${xmlEscape(now)}</lastmod>`,
          "    <changefreq>weekly</changefreq>",
          path === "/" ? "    <priority>1.0</priority>" : "    <priority>0.8</priority>",
          "  </url>",
        ].join("\n");
      })
      .join("\n");

    const xml = [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
      urlset,
      "</urlset>",
      "",
    ].join("\n");

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=3600",
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: err instanceof Error ? err.message : "Server error",
    };
  }
};
