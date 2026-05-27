import { GoogleGenAI, Type } from "@google/genai";
import { GenogramData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function recognizeGenogramFromImage(base64Image: string, mimeType: string): Promise<GenogramData> {
  const prompt = `
    Analyze this family genogram image and convert it into a structured JSON format.
    The response must follow the schema provided.
    
    Guidelines:
    1. Identify all family members/symbols. Assign them a gender (male/female/unknown) based on their shape (Square = male, Circle = female).
    2. IMPORTANT: DO NOT extract ANY text or labels (names, ages, dates, notes) from the image. 
       - Set the "name" field for all members to an empty string ("").
       - Set the "age" field for all members to an empty string ("").
       - Set the "note" field for all members to an empty string ("").
    3. Identify marriages/unions between members based on the lines connecting them.
    4. Identify children belonging to those unions (lines branching down from union lines).
    5. Provide x and y coordinates for each member in a 0 to 1000 coordinate space to maintain relative positioning.
    
    Return a JSON object matching this structure:
    {
      "members": [
        { "id": "m1", "name": "", "gender": "male", "x": 500, "y": 200, "age": "", "note": "" }
      ],
      "unions": [
        { "id": "u1", "partnerAId": "m1", "partnerBId": "m2", "type": "marriage" }
      ],
      "children": [
        { "id": "c1", "unionId": "u1", "memberId": "m3" }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove prefix if present
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          members: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                gender: { type: Type.STRING, enum: ["male", "female", "unknown"] },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                age: { type: Type.STRING },
                isDeceased: { type: Type.BOOLEAN },
                note: { type: Type.STRING }
              },
              required: ["id", "name", "gender", "x", "y"]
            }
          },
          unions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                partnerAId: { type: Type.STRING },
                partnerBId: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["marriage", "cohabitation", "separation", "divorce"] }
              },
              required: ["id", "partnerAId", "partnerBId", "type"]
            }
          },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                unionId: { type: Type.STRING },
                memberId: { type: Type.STRING }
              },
              required: ["id", "unionId", "memberId"]
            }
          }
        },
        required: ["members", "unions", "children"]
      }
    }
  });

  const content = JSON.parse(response.text || "{}");
  return content as GenogramData;
}
