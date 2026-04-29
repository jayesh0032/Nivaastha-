'use server';
import { generatePropertyDescription, type GeneratePropertyDescriptionInput } from "@/ai/flows/generate-property-description";

export async function getAIDescription(data: GeneratePropertyDescriptionInput) {
  try {
    const result = await generatePropertyDescription(data);
    return { success: true, description: result.description };
  } catch (error) {
    console.error("AI description generation failed:", error);
    return { success: false, error: "Failed to generate description. Please try again." };
  }
}
