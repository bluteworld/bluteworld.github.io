// generateTags.js
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTagsFromImage(imageUrl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that analyzes whimsical cartoon character illustrations and returns simple tags for game logic (e.g., 'cake', 'guitar', 'celebration', 'sleeping'). Return only the tags."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Give me a list of 5–8 relevant, concise tags for this character scene:" },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ],
    max_tokens: 100
  });

  const raw = response.choices[0].message.content;
  const tags = raw
    .split(/[,;\n]/)
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0);

  return tags;
}
