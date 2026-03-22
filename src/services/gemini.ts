import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
}

export interface StoryBlueprint {
  title: string;
  author: string;
  characterDescription: string;
  pages: StoryPage[];
}

export async function generateStoryBlueprint(
  topic: string,
  style: string,
  author: string,
  charDesc: string
): Promise<StoryBlueprint> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Create a 10-page children's story blueprint.
    TOPIC: ${topic}
    STYLE INSPIRATION: ${style}
    AUTHOR NAME: ${author}
    CHARACTER DESCRIPTION: ${charDesc || "Create a unique, visually distinct protagonist (e.g., 'A young boy with curly red hair, wearing green overalls and a blue striped shirt')"}

    PHASE 1: STORY ARCHITECTURE
    1. If CHARACTER DESCRIPTION was blank, define a specific protagonist.
    2. Write a 10-page story in rhyming couplets (2 lines per page).
    3. Ensure the tone matches the STYLE INSPIRATION.

    Return a JSON object with:
    - title: "A Child's First Book on ${topic}"
    - author: "${author}"
    - characterDescription: The final character description used.
    - pages: An array of 10 objects, each with:
      - pageNumber: 1-10
      - text: The 2-line rhyming couplet.
      - illustrationPrompt: A detailed prompt for an image generator (Gemini) to illustrate this specific page, ensuring consistency with the character and style.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          characterDescription: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.NUMBER },
                text: { type: Type.STRING },
                illustrationPrompt: { type: Type.STRING }
              },
              required: ["pageNumber", "text", "illustrationPrompt"]
            }
          }
        },
        required: ["title", "author", "characterDescription", "pages"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePageImage(
  prompt: string,
  style: string,
  charDesc: string,
  text: string,
  isCover: boolean = false
): Promise<string> {
  // We use gemini-2.5-flash-image for image generation
  const fullPrompt = `
    STYLE: ${style}. Vintage, textured, minimalist aesthetics with cinematic lighting.
    CHARACTER: ${charDesc}.
    SCENE: ${prompt}
    ${isCover ? "This is the cover page. Make it iconic." : ""}
    NO TEXT IN IMAGE. I will overlay text later.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: fullPrompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "2:3",
      }
    }
  });

  let base64 = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      base64 = part.inlineData.data;
      break;
    }
  }

  if (!base64) throw new Error("Failed to generate image");
  return `data:image/png;base64,${base64}`;
}
