import { sitemapIds } from "@/server/services/seo.service";
import { sitemapPartXml, XML_HEADERS } from "@/server/services/sitemap";

// GET /sitemap/<id>.xml — one sitemap part (see server/services/sitemap.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^(\d+)\.xml$/.exec(file);
  const id = m ? Number(m[1]) : NaN;
  if (!m || !(await sitemapIds()).includes(id)) return new Response("Not found", { status: 404 });
  return new Response(await sitemapPartXml(id), { headers: XML_HEADERS });
}
