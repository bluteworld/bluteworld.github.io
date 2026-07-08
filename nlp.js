const COLOR_KEYWORDS = {
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  olive: 'olive',
  khaki: 'olive',
  pink: 'pink',
  mauve: 'pink',
  brown: 'brown',
  tan: 'brown',
  red: 'red',
  coral: 'red',
  orange: 'orange',
  teal: 'teal',
  purple: 'purple',
  lavender: 'purple',
  gray: 'gray',
  grey: 'gray',
  white: 'gray',
  beige: 'beige',
};

const ATTRIBUTE_KEYWORDS = [
  { attribute: 'wearing_glasses', trueWords: ['glasses', 'spectacles', 'specs', 'eyewear', 'eye mask', 'eyemask'] },
  { attribute: 'wearing_hat', trueWords: ['hat', 'cap'] },
  { attribute: 'has_mustache', trueWords: ['mustache', 'moustache'] },
  { attribute: 'wearing_clothing', trueWords: ['clothing', 'clothes', 'outfit', 'dressed'] },
  { attribute: 'with_animal', trueWords: ['animal', 'pet', 'dog', 'bird'] },
  { attribute: 'is_eating_or_drinking', trueWords: ['eating', 'drinking', 'eat', 'drink'] },
  { attribute: 'holding_food', trueWords: ['holding food', 'food', 'snack'] },
  { attribute: 'is_doing_sport', trueWords: ['sport', 'sports', 'exercise', 'exercising', 'athletic'] },
  { attribute: 'is_doing_creative', trueWords: ['creative', 'art', 'painting', 'drawing'] },
  { attribute: 'is_relaxing', trueWords: ['relaxing', 'resting', 'relax', 'rest', 'chilling'] },
  { attribute: 'is_working', trueWords: ['working', 'work', 'job'] },
  { attribute: 'is_outdoors', trueWords: ['outdoors', 'outside'] },
  { attribute: 'is_indoors', trueWords: ['indoors', 'inside'] },
  { attribute: 'has_hearts', trueWords: ['hearts', 'heart', 'love'] },
  { attribute: 'has_music_notes', trueWords: ['music', 'music notes', 'singing', 'song'] },
  { attribute: 'is_fancy_dressed', trueWords: ['fancy', 'elegant', 'elegantly', 'dressed up'] },
  { attribute: 'is_traveling', trueWords: ['traveling', 'travelling', 'travel', 'trip', 'journey'] },
  { attribute: 'holding_tool_or_prop', trueWords: ['tool', 'prop', 'holding a tool', 'holding an object'] },
  { attribute: 'is_at_beach', trueWords: ['beach'] },
  { attribute: 'is_in_water', trueWords: ['water', 'swimming', 'wet', 'ocean', 'sea'] },
  { attribute: 'is_celebrating', trueWords: ['celebrating', 'celebrate', 'party', 'celebration'] },
  { attribute: 'is_in_costume', trueWords: ['costume', 'disguise'] },
  { attribute: 'has_hair', trueWords: ['hair'] },
  {
    attribute: 'eyes_open',
    trueWords: ['eyes open', 'awake', 'open eyes'],
    falseWords: ['eyes closed', 'closed eyes', 'sleeping', 'asleep', 'shut eyes', 'eyes shut'],
  },
  { attribute: 'is_sitting', trueWords: ['sitting', 'sit', 'seated'] },
  { attribute: 'is_standing', trueWords: ['standing', 'stand'] },
  { attribute: 'has_eyebrows', trueWords: ['eyebrows', 'eyebrow', 'brows', 'brow'] },
  { attribute: 'hands_visible', trueWords: ['hands', 'hand', 'arms', 'arm'] },
];

const NEGATION_PATTERN = /\b(not|n't|never|no|isn't|isnt|doesn't|doesnt|aren't|arent|without)\b/;

// Embedding fallback is deliberately NOT used for color: GloVe-style vectors place
// color words close to *each other* regardless of which color (yellow~blue is a
// stronger match than many true synonym pairs), so similarity can't reliably tell
// colors apart. Colors stay on exact keyword matching only.
const EMBEDDING_SIMILARITY_THRESHOLD = 0.65;
const EMBEDDING_MARGIN = 0.08;
const EMBEDDING_STOPWORDS = new Set([
  'is', 'it', 'a', 'an', 'the', 'are', 'does', 'do', 'have', 'has', 'in', 'on', 'at',
  'of', 'its', 'this', 'that', 'there', 'being', 'be', 'with', 'and', 'or', 'to',
]);

function normalizeQuestionText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function vectorNorm(a) {
  return Math.sqrt(dotProduct(a, a));
}

function cosineSimilarity(a, b) {
  const denom = vectorNorm(a) * vectorNorm(b);
  return denom === 0 ? 0 : dotProduct(a, b) / denom;
}

function averageVector(words) {
  const vectors = words.map((w) => WORD_VECTORS[w]).filter(Boolean);
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= vectors.length;
  return avg;
}

const CONCEPT_VECTORS = (function buildConceptVectors() {
  const concepts = [];
  ATTRIBUTE_KEYWORDS.forEach((entry) => {
    const trueVec = averageVector(entry.trueWords.filter((w) => !w.includes(' ')));
    if (trueVec) concepts.push({ attribute: entry.attribute, expected: true, vector: trueVec });

    if (entry.falseWords) {
      const falseVec = averageVector(entry.falseWords.filter((w) => !w.includes(' ')));
      if (falseVec) concepts.push({ attribute: entry.attribute, expected: false, vector: falseVec });
    }
  });
  return concepts;
})();

function embeddingMatch(text) {
  const words = text.split(' ').filter((w) => w && !EMBEDDING_STOPWORDS.has(w));
  const questionVec = averageVector(words);
  if (!questionVec) return null;

  let best = null;
  let bestScore = -Infinity;
  let secondScore = -Infinity;

  for (const concept of CONCEPT_VECTORS) {
    const score = cosineSimilarity(questionVec, concept.vector);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = concept;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (!best) return null;
  if (bestScore < EMBEDDING_SIMILARITY_THRESHOLD) return null;
  if (bestScore - secondScore < EMBEDDING_MARGIN) return null;

  return best;
}

function interpretQuestion(secret, rawText) {
  const text = normalizeQuestionText(rawText);
  if (!text) return null;

  const negated = NEGATION_PATTERN.test(text);

  for (const word in COLOR_KEYWORDS) {
    if (containsPhrase(text, word)) {
      const match = secret.color === COLOR_KEYWORDS[word];
      return negated ? !match : match;
    }
  }

  for (const entry of ATTRIBUTE_KEYWORDS) {
    for (const word of entry.trueWords) {
      if (containsPhrase(text, word)) {
        const value = secret.attributes[entry.attribute] === true;
        return negated ? !value : value;
      }
    }
    if (entry.falseWords) {
      for (const word of entry.falseWords) {
        if (containsPhrase(text, word)) {
          const value = secret.attributes[entry.attribute] === false;
          return negated ? !value : value;
        }
      }
    }
  }

  const embConcept = embeddingMatch(text);
  if (embConcept) {
    const value = secret.attributes[embConcept.attribute] === embConcept.expected;
    return negated ? !value : value;
  }

  return null;
}
