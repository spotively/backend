import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";

export class ImageService {
  private ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  async generateImage(items: string[], type: string): Promise<string> {
    const prompt = `
    Generate a beautiful, highly aesthetic, minimalist, abstract background image that perfectly captures the musical vibe and mood of these 
    ${type}: ${items.join(', ')}. The image should have a dark, moody overlay suitable for readable white text on top. No text in the image itself. 
    High quality, premium design.
    `;

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: prompt,
          config: {
            responseModalities: ["IMAGE"],
          },
        });

        const candidates = (response as any).candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error("No candidates in Gemini response");
        }

        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            return part.inlineData.data;
          }
        }

        throw new Error("No image data in Gemini response parts");
      } catch (err) {
        if (i === 4) throw err;
        console.error(`Retry ${i + 1} failed:`, err);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
    throw new Error('Failed to generate image after retries');
  }

  createSVGOverlay(base64Image: string, items: string[], type: string): string {
    const title = `Your Top 10 ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    // Generate text nodes for each item
    const textNodes = items.map((item, index) => {
      // Escape XML characters to prevent SVG injection/breakage
      const safeItem = item.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<text x="80" y="${220 + (index * 60)}" font-family="system-ui, sans-serif" font-size="32" fill="#ffffff" font-weight="500">${index + 1}. ${safeItem}</text>`;
    }).join('\n');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
        <defs>
          <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(0,0,0,0.3)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0.8)"/>
          </linearGradient>
        </defs>
        
        <!-- Generated Vibe Background -->
        <image href="data:image/jpeg;base64,${base64Image}" width="1080" height="1080" preserveAspectRatio="xMidYMid slice"/>
        
        <!-- Dark Gradient Overlay for Text Readability -->
        <rect width="1080" height="1080" fill="url(#overlay)"/>
        
        <!-- Header -->
        <text x="80" y="120" font-family="system-ui, sans-serif" font-size="56" fill="#1DB954" font-weight="800" letter-spacing="2">SPOTIFY VIBE</text>
        <text x="80" y="180" font-family="system-ui, sans-serif" font-size="24" fill="#B3B3B3" font-weight="400" letter-spacing="1">${title.toUpperCase()}</text>
        
        <!-- List Items -->
        ${textNodes}
        
        <!-- Branding -->
        <text x="80" y="1000" font-family="system-ui, sans-serif" font-size="20" fill="rgba(255,255,255,0.5)">Generated via Spotify Web API &amp; Gemini</text>
      </svg>
    `.trim();
  }
}
