import { searchEditorialFoodImages } from "./src/lib/editorialImageSearch";

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  SERPER_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/+$/, "");

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
