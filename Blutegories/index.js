// index.js
import { generateTagsFromImage } from "./generateTags.js";

// Replace these with your actual GitHub raw image URLs
const imageUrls = [
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/character1.png",
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/character2.png",
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/character3.png",
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/character4.png"
];

async function generateDailyPuzzle() {
  const results = [];
  for (const url of imageUrls) {
    const tags = await generateTagsFromImage(url);
    results.push({ url, tags });
  }

  console.log("🧩 Daily Puzzle:");
  console.log(JSON.stringify(results, null, 2));
}

generateDailyPuzzle();
