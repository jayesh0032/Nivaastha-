'use server';

/**
 * @fileOverview AI agent to generate a compelling property description from uploaded photos and key details.
 *
 * - generatePropertyDescription - A function that handles the property description generation process.
 * - GeneratePropertyDescriptionInput - The input type for the generatePropertyDescription function.
 * - GeneratePropertyDescriptionOutput - The return type for the generatePropertyDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePropertyDescriptionInputSchema = z.object({
  propertyType: z.enum(['House', 'Villa', 'Flat', 'Shop', 'Showroom', 'PG for boys', 'PG for girls', 'PG']).describe('The type of property.'),
  hallPhotos: z
    .array(z.string())
    .describe(
      'Hall photos of the property, as data URIs that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  roomPhotos: z
    .array(z.string())
    .describe(
      'Room photos of the property, as data URIs that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' + 
      'These should be photos of the rooms inside the property.'
    ),
  kitchenPhoto: z
    .string()
    .describe(
      'A photo of the kitchen, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  frontViewPhoto: z
    .string()
    .describe(
      'A photo of the front view of the property, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  bhkType: z.string().describe('The BHK type of the property (e.g., 1BHK, 2BHK, etc.).'),
  suitableFor: z.enum(['Family', 'Bachelor', 'Commercial']).describe('Who the property is suitable for.'),
  monthlyRentAmount: z.number().describe('The monthly rent amount for the property.'),
  floorNumber: z.string().optional().describe('The floor number of the property.'),
});
export type GeneratePropertyDescriptionInput = z.infer<typeof GeneratePropertyDescriptionInputSchema>;

const GeneratePropertyDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling description of the property.'),
});
export type GeneratePropertyDescriptionOutput = z.infer<typeof GeneratePropertyDescriptionOutputSchema>;

export async function generatePropertyDescription(input: GeneratePropertyDescriptionInput): Promise<GeneratePropertyDescriptionOutput> {
  return generatePropertyDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePropertyDescriptionPrompt',
  input: {schema: GeneratePropertyDescriptionInputSchema},
  output: {schema: GeneratePropertyDescriptionOutputSchema},
  prompt: `You are an expert real estate copywriter. You will be provided with photos and details of a property, and your goal is to write a compelling and attractive description to entice potential renters or businesses.

Property Type: {{{propertyType}}}
{{#if floorNumber}}
Floor: {{{floorNumber}}}
{{/if}}
BHK Type: {{{bhkType}}}
Suitable For: {{{suitableFor}}}
Monthly Rent: {{{monthlyRentAmount}}}

Hall Photos:
{{#each hallPhotos}}
{{media url=this}}
{{/each}}

Room Photos:
{{#each roomPhotos}}
{{media url=this}}
{{/each}}

Kitchen Photo: {{media url=kitchenPhoto}}
Front View Photo: {{media url=frontViewPhoto}}

Write a short, engaging description of the property. If it is a commercial property (Shop/Showroom) or a PG, tailor the description for the target audience (business owners or students/bachelors).
`,
});

const generatePropertyDescriptionFlow = ai.defineFlow(
  {
    name: 'generatePropertyDescriptionFlow',
    inputSchema: GeneratePropertyDescriptionInputSchema,
    outputSchema: GeneratePropertyDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
