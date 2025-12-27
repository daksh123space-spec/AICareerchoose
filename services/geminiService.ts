
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SubjectGrade, RecommendationResponse } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

export const getCareerRecommendations = async (subjects: SubjectGrade[]): Promise<RecommendationResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const subjectsString = subjects
    .map(s => `${s.name}: ${s.grade}`)
    .join(', ');

  const prompt = `Analyze the following high school subjects and their percentage grades: ${subjectsString}. 
    Based on these academic strengths and interests, recommend 4 diverse future career paths. 
    Consider the difficulty of subjects and how percentage marks reflect potential aptitude and dedication in specific fields.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                whyFit: { type: Type.STRING },
                nextSteps: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                },
                growthPotential: { 
                  type: Type.STRING,
                  description: "Must be 'High', 'Medium', or 'Low'"
                },
              },
              required: ["title", "description", "whyFit", "nextSteps", "growthPotential"]
            }
          },
          overallSummary: { type: Type.STRING }
        },
        required: ["recommendations", "overallSummary"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as RecommendationResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not interpret recommendations. Please try again.");
  }
};

export const createAdvisorChat = (context: RecommendationResponse, subjects: SubjectGrade[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  const subjectsString = subjects.map(s => `${s.name} (${s.grade})`).join(', ');
  
  return ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `You are an expert Career Advisor AI. 
      The student has the following profile with percentage grades: ${subjectsString}.
      You previously recommended: ${context.recommendations.map(r => r.title).join(', ')}.
      
      GUIDELINES:
      - Use clean Markdown for formatting (bold for emphasis, bullet points for lists).
      - Academic grades are percentages where 90-100% is exceptional, 70-89% is strong, and <50% might indicate a struggle.
      - Avoid using excessive headers (###) inside short chat messages.
      - Be encouraging and actionable.
      - If asked about specific universities or degrees, provide general paths and requirements.
      - Keep responses conversational but professional.`,
    },
  });
};
