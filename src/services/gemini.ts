import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
  imageUrl?: string;
}

export interface KDPMetadata {
  title: string;
  keywords: string[];
  amazonDescription: string;
}

export interface SocialBundle {
  facebook: string;
  pinterest: string;
  linkedin: string;
  twitter: string;
}

export interface StoryBlueprint {
  title: string;
  author: string;
  characterDescription: string;
  pages: StoryPage[];
  kdpMetadata?: KDPMetadata;
  socialBundle?: SocialBundle;
}

export async function generateCharacterBlueprint(
  archetype: string,
  customDesc: string
): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Create a detailed visual description for a children's book protagonist.
    ARCHETYPE: ${archetype}
    CUSTOM DESCRIPTION: ${customDesc || "None"}
    
    If ARCHETYPE is "Custom", use only the CUSTOM DESCRIPTION.
    Otherwise, expand the ARCHETYPE into a high-fidelity visual blueprint (e.g., "A young boy with curly red hair, wearing green overalls and a blue striped shirt").
    Focus on colors, clothing, and distinct features that can be consistently described.
    Return only the description string.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text || "";
}

export async function generateStoryBlueprint(
  topic: string,
  style: string,
  author: string,
  charDesc: string,
  pageCount: number
): Promise<StoryBlueprint> {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Create a ${pageCount}-page children's story blueprint.
    TOPIC: ${topic}
    STYLE INSPIRATION: ${style}
    AUTHOR NAME: ${author}
    CHARACTER DESCRIPTION: ${charDesc}

    PHASE 1: STORY ARCHITECTURE
    1. Write a ${pageCount}-page story in rhyming couplets (2 lines per page).
    2. Ensure the tone matches the STYLE INSPIRATION.

    PHASE 2: KDP METADATA
    1. Generate a high-volume Title.
    2. Generate 7 backend Search Keywords.
    3. Generate a "Vivid HTML" formatted Amazon Description.

    PHASE 3: SOCIAL BUNDLE
    1. Facebook: Engagement-focused post.
    2. Pinterest: Vertical "Aesthetic" description with tags.
    3. LinkedIn: Professional/Educational "Process" post.
    4. Twitter/X: Thread-style hook.

    Return a JSON object with:
    - title: The final book title.
    - author: "${author}"
    - characterDescription: "${charDesc}"
    - pages: An array of ${pageCount} objects, each with:
      - pageNumber: 1-${pageCount}
      - text: The 2-line rhyming couplet.
      - illustrationPrompt: A detailed prompt for an image generator (Gemini) to illustrate this specific page, ensuring consistency with the character and style.
    - kdpMetadata: { title, keywords: string[], amazonDescription }
    - socialBundle: { facebook, pinterest, linkedin, twitter }
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
          },
          kdpMetadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              amazonDescription: { type: Type.STRING }
            },
            required: ["title", "keywords", "amazonDescription"]
          },
          socialBundle: {
            type: Type.OBJECT,
            properties: {
              facebook: { type: Type.STRING },
              pinterest: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              twitter: { type: Type.STRING }
            },
            required: ["facebook", "pinterest", "linkedin", "twitter"]
          }
        },
        required: ["title", "author", "characterDescription", "pages", "kdpMetadata", "socialBundle"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePageImage(
  prompt: string,
  style: string,
  charDesc: string,
  isCover: boolean = false
): Promise<string> {
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
