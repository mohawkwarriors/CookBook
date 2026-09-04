import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Extract recipe from https://www.allrecipes.com/recipe/20144/banana-banana-bread/",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          ingredients: { type: "ARRAY", items: { type: "STRING" } }
        }
      }
    }
  });
  console.log(response.text);
}
run().catch(console.error);
