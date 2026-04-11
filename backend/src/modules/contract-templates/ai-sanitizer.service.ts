import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getGeminiSanitizerEnv } from '../../config/env';

@Injectable()
export class AiSanitizerService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    const env = getGeminiSanitizerEnv();
    this.genAI = new GoogleGenerativeAI(env.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: env.model,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  /**
   * Identifies sensitive entities in the provided text using AI.
   * Returns a map of { "originalText": "entityType" }.
   */
  async identifySensitiveEntities(text: string): Promise<Record<string, string>> {
    const prompt = `
You are a legal document expert specializing in data privacy and data anonymization.
Your task is to identify all sensitive Personal Identifiable Information (PII) and Company Identifiable Information (CII) in the provided contract text.

ENTITIES TO IDENTIFY:
- Names of natural persons (Full names, aliases).
- Company names / Organization names (Full legal names, trade names, short names, abbreviations). Group variations of the same company name.
- Party Aliases: Any short names used to refer to the parties throughout the document.
- Physical addresses (Full addresses, street names, city, province).
- Dates (Birthdays, signing dates, effective dates, commencement dates).
- Identification numbers (ID card, Passport, Social Security, Tax ID / MST, Business Registration ID).
- Contact info (Phone numbers, Email addresses, Fax, Websites).
- Bank details (Account numbers, Bank names, Branch names).
- Representative names (Legal representatives, authorized signatories).
- Currencies and Amounts: Identify numeric amounts AND their associated written-out explanations in parentheses (e.g., "34.000.000 VNĐ (Ba mươi bốn triệu đồng)"). These MUST be captured as a SINGLE entity substring or two separate substrings if they are not adjacent. Ideally, capture the longest possible string that includes the explanation.

CRITICAL RULES:
1. DO NOT identify legal terms of art or generic placeholders such as: "Bên A", "Bên B", "Party A", "Party B", "The Agreement", "Điều 1", "Article 2", "Clause 3".
2. The identified text must be exactly as it appears in the source text.
3. For amounts, if you see "1.000.000 VNĐ (Một triệu đồng)", the key should be "1.000.000 VNĐ (Một triệu đồng)".
4. Be comprehensive. Deduplicate logically: if "Block71" and "BLOCK 71" refer to the same party, identify both.

OUTPUT FORMAT:
Return ONLY a valid JSON object where the keys are the EXACT substrings found in the text and the values are their categories (string).
Category examples: COMPANY, PERSON, DATE, ADDRESS, ID, CONTACT, BANK, REPRESENTATIVE, CURRENCY.

TEXT TO PROCESS:
---
${text}
---
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonStr = response.text();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('AI Sanitization Identification failed:', error);
      return {}; // Fallback to empty map
    }
  }
}
