/**
 * Structured data for search engines (schema.org JSON-LD). Rendered on the server into the HTML.
 * "<" is escaped so data from the DB can never close the <script> tag (XSS-safe).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(Array.isArray(data) ? data : data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** BreadcrumbList from [name, absoluteUrl] pairs. */
export function breadcrumbLd(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };
}
