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

    if (url.pathname === "/api/search-recipe-images") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }

      const q = url.searchParams.get("q") || "";
      const cuisine = url.searchParams.get("cuisine") || "";

      const result = await searchEditorialFoodImages({
        query: q,
        cuisine,
        serperKey: env.SERPER_API_KEY,
        braveKey: env.BRAVE_SEARCH_API_KEY,
        maxResults: 6,
      });

      return Response.json(result, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
