import { searchEditorialFoodImages } from "../../src/lib/editorialImageSearch";

interface Env {
  SERPER_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const reqUrl = new URL(context.request.url);
  const q = (reqUrl.searchParams.get("q") || "").trim();
  const cuisine = (reqUrl.searchParams.get("cuisine") || "").trim();
  const fresh = reqUrl.searchParams.get("fresh") === "1";

  const result = await searchEditorialFoodImages({
    query: q,
    cuisine,
    serperKey: context.env.SERPER_API_KEY,
    braveKey: context.env.BRAVE_SEARCH_API_KEY,
    maxResults: 10,
  });

  const cacheControl =
    !fresh && result.photos.length > 0 ? "public, max-age=3600" : "no-store";

  return Response.json(result, {
    headers: {
      "Cache-Control": cacheControl,
    },
  });
};
