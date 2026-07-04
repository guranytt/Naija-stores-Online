import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { productName, category, brand, features, specifications, condition } = req.body;
    
    if (!productName || !category) {
      return res.status(400).json({ error: "Product name and category are required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API Key is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `You are an ecommerce copywriter.

Generate:
* Product title
* Product description
* Key features
* Product highlights
* Specifications
* SEO title
* SEO description
* Product tags
* Search keywords

Product Name: ${productName}
Category: ${category}
Brand: ${brand || 'N/A'}
Features: ${features || 'N/A'}
Specifications: ${specifications || 'N/A'}
Condition: ${condition || 'N/A'}

No exaggerated claims. No fake specifications. No fake warranties. No misleading information. Use only information provided by the vendor. Maintain professional ecommerce tone. Optimize for Nigerian ecommerce shoppers.

Return valid JSON only matching this schema exactly:
{
  "productTitle": "SEO-friendly, max 70 chars",
  "productDescription": "Persuasive, max 40 words",
  "keyFeatures": ["feature 1", "feature 2"],
  "productHighlights": ["highlight 1", "highlight 2"],
  "specifications": [{"key": "Spec Name", "value": "Spec Value"}],
  "seoTitle": "max 60 chars",
  "seoDescription": "max 40 chars",
  "searchKeywords": ["keyword 1", "keyword 2"],
  "productTags": ["tag1", "tag2"],
  "suggestedCategory": "Category if blank or better match"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const text = response.text;
    if (!text) {
      throw new Error("No text returned from model");
    }
    
    const result = JSON.parse(text);
    res.status(200).json(result);
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Failed to generate listing with AI", details: err.message });
  }
}
