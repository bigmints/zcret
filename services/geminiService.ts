import { GoogleGenAI, Type } from "@google/genai";
import { PasswordAnalysis } from "../types";

// Initialize Gemini
// Note: In a real production app, you might proxy this through a backend to protect the key,
// or use Firebase Functions. For this demo, we use the env variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePasswordStrength = async (password: string): Promise<PasswordAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the strength of this password: "${password}". Do not reveal the password in the output.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "A score from 0 to 100 where 100 is uncrackable." },
            feedback: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of specific constructive feedback points."
            },
            crackTimeEstimate: { type: Type.STRING, description: "Estimated time to crack via brute force (e.g. '3 days', 'Centuries')." }
          },
          required: ["score", "feedback", "crackTimeEstimate"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as PasswordAnalysis;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("AI Analysis failed", error);
    // Fallback if AI fails
    return {
      score: 50,
      feedback: ["Could not analyze with AI at this moment.", "Ensure it is long and uses mixed characters."],
      crackTimeEstimate: "Unknown"
    };
  }
};

export const generateSecurePassword = async (context?: string): Promise<string> => {
  try {
    const prompt = context 
      ? `Generate a strong, secure password relevant to: ${context}. It should be random but memorable if possible.` 
      : "Generate a cryptographically strong random password, 16 characters long, mixed case, numbers, and symbols.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            password: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.password;
    }
    return "F@llb@ckP4ssw0rd!";
  } catch (e) {
    console.error(e);
    return "Error-Generating-Pass-123";
  }
};