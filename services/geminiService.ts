
import { GoogleGenAI, Type } from "@google/genai";

// Guideline: Avoid global instances if possible; instead, create a new GoogleGenAI instance right before making an API call.

export const getCreativeFeedback = async (caption: string, rating: number) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `An artist posted: "${caption}" and it received a rating of ${rating}/5. 
      Provide a constructive, encouraging creative critique in 2 sentences.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep creating! Your vision is unique.";
  }
};

export const generateArtPrompt = async (theme: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a detailed artistic prompt for an image generator based on this theme: "${theme}". 
      Make it professional, artistic, and visually rich.`,
    });
    return response.text;
  } catch (error) {
    return theme;
  }
};

export const generateCreativeImage = async (prompt: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image Gen Error:", error);
  }
  return null;
};
