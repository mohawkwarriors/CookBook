import { searchEditorialFoodImages } from "./src/lib/editorialImageSearch";
import { parseRecipeFromUrl } from "./src/lib/recipeUrlParser";

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  SERPER_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/+$/, "");

    if (normalizedPath === "/api/parse-url") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            Allow: "POST, OPTIONS",
            "Cache-Control": "no-store",
          },
        });
      }

      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed. Use POST." },
          {
            status: 405,
            headers: {
              Allow: "POST, OPTIONS",
              "Cache-Control": "no-store",
            },
          }
        );
      }

      let rawUrl = "";
      try {
        const body = (await request.json()) as { url?: unknown } | null;
        if (body && typeof body.url === "string") {
          rawUrl = body.url;
        }
      } catch {
        return Response.json(
          { error: "Invalid JSON request body." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      try {
        const result = await parseRecipeFromUrl({
          url: rawUrl,
          geminiApiKey: env.GEMINI_API_KEY,
        });

        if (!result.ok) {
          return Response.json(
            { error: result.error },
            { status: result.status, headers: { "Cache-Control": "no-store" } }
          );
        }

        return Response.json(result.recipe, {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        });
      } catch (err: any) {
        return Response.json(
          { error: err?.message || "An error occurred while parsing the URL." },
          { status: 500, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (normalizedPath === "/api/search-recipe-images") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }

      const q = url.searchParams.get("q") || "";
      const cuisine = url.searchParams.get("cuisine") || "";
      const fresh = url.searchParams.get("fresh") === "1";

      const result = await searchEditorialFoodImages({
        query: q,
        cuisine,
        serperKey: env.SERPER_API_KEY,
        braveKey: env.BRAVE_SEARCH_API_KEY,
        maxResults: 10,
      });

      const cacheControl =
        !fresh && result.photos.length > 0 ? "public, max-age=3600" : "no-store";

      return Response.json(result, {
        headers: {
          "Cache-Control": cacheControl,
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
