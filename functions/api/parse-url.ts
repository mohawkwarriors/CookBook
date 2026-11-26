import { parseRecipeFromUrl } from "../../src/lib/recipeUrlParser";

interface Env {
  GEMINI_API_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

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
};
