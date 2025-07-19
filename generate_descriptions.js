// generate_descriptions.js
import fs from "fs";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Your GitHub image URLs go here
const imageUrls = [
  "https://github.com/bluteworld/bluteworld/blob/main/assets/b(10).png?raw=true",
  "https://github.com/bluteworld/bluteworld/blob/main/assets/b(12).png?raw=true",
  "https://github.com/bluteworld/bluteworld/blob/main/assets/b(17).png?raw=true"
];

async function generateDescriptions(url) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an assistant that describes whimsical cartoon characters called Blutes for a visual guessing game."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Look at this image of a Blute and return the following:
            
1. A short fun name for the Blute (like "Chef Blute" or "Sneaky Blute")
2. A list of 10–20 short, descriptive phrases (under 10 words) about what the Blute is doing, holding, wearing, or surrounded by.

Use this exact format:

Name: [the name]
Descriptions:
- [description 1]
- [description 2]
...
`
          },
          {
            type: "image_url",
            image_url: { url }
          }
        ]
      }
    ],
    max_tokens: 300
  });

  const raw = response.choices[0].message.content;

  const nameMatch = raw.match(/Name:\s*(.+)/i);
  const name = nameMatch ? nameMatch[1].trim() : "Unnamed Blute";

  const descriptionLines = raw
    .split(/Descriptions:/i)[1]
    ?.split(/\n|,|;/)
    .map(line => line.trim().replace(/^[-•*]\s*/, "").toLowerCase())
    .filter(line => line.length > 0) || [];

  return { name, descriptions: descriptionLines };
}

async function run() {
  const result = [];

  for (const url of imageUrls) {
    console.log(`🖼️ Processing: ${url}`);
    try {
      const { name, descriptions } = await generateDescriptions(url);
      result.push({ url, name, descriptions });
    } catch (err) {
      console.error(`❌ Failed to process ${url}`, err.message);
    }
  }

  fs.writeFileSync("images.json", JSON.stringify(result, null, 2));
  console.log("✅ Done! Saved to images.json");
}

run();
