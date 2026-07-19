const ATTRIBUTE_KEYWORDS = {
  wearing_glasses: {
    yes: ['glasses', 'wearing glasses', 'spectacles', 'specs', 'eyeglasses', 'sunglasses', 'eye mask', 'sleep mask', 'blindfold'],
    no: ['no glasses', 'without glasses', 'not wearing glasses', 'no eye mask'],
  },
  wearing_hat: {
    yes: ['hat', 'cap', 'beanie', 'wearing a hat', 'headwear', 'helmet'],
    no: ['no hat', 'hatless', 'without a hat', 'bare head', 'not wearing a hat'],
  },
  has_mustache: {
    yes: ['mustache', 'moustache', 'stache'],
    no: ['no mustache', 'without a mustache', 'clean shaven', 'no facial hair'],
  },
  wearing_clothing: {
    yes: ['clothing', 'clothes', 'outfit', 'wearing clothes', 'shirt', 'wearing something', 'dressed'],
    no: ['no clothes', 'naked', 'not wearing clothes', 'no clothing', 'no outfit'],
  },
  with_animal: {
    yes: ['animal', 'pet', 'with an animal', 'dog', 'cat', 'bird', 'creature'],
    no: ['no animal', 'without an animal', 'no pet'],
  },
  is_eating_or_drinking: {
    yes: ['eating', 'drinking', 'sipping', 'snacking', 'having a meal', 'sipping a drink'],
    no: ['not eating', 'not drinking', 'no food or drink'],
  },
  holding_food: {
    yes: ['holding food', 'holding a snack', 'has food', 'carrying food', 'holding groceries'],
    no: ['no food', 'not holding food', 'without food'],
  },
  is_doing_sport: {
    yes: ['sport', 'exercise', 'exercising', 'working out', 'workout', 'playing', 'athletic', 'sporty', 'physical activity'],
    no: ['not exercising', 'no sport', 'not playing a sport'],
  },
  is_doing_creative: {
    yes: ['creative', 'art', 'artistic', 'making art', 'painting', 'drawing', 'crafting', 'creating something'],
    no: ['not creative', 'no art'],
  },
  is_doing_activity: {
    yes: ['doing an activity', 'an activity', 'doing something active', 'doing some activity'],
    no: ['not doing an activity', 'no activity', 'not doing anything', 'inactive'],
  },
  is_relaxing: {
    yes: ['relaxing', 'resting', 'relaxed', 'chilling', 'lounging', 'taking it easy', 'at ease'],
    no: ['not relaxing', 'not resting'],
  },
  is_working: {
    yes: ['working', 'job', 'employed', 'at work', 'working a job', 'on the job', 'occupation'],
    no: ['not working', 'unemployed', 'off work'],
  },
  is_chef: {
    yes: ['chef', 'a chef', 'cook', 'a cook'],
    no: ['not a chef', 'not a cook'],
  },
  is_doctor: {
    yes: ['doctor', 'a doctor', 'physician'],
    no: ['not a doctor'],
  },
  is_farmer: {
    yes: ['farmer', 'a farmer'],
    no: ['not a farmer'],
  },
  is_artist: {
    yes: ['artist', 'an artist', 'painter'],
    no: ['not an artist'],
  },
  is_programmer: {
    yes: ['programmer', 'a programmer', 'coder', 'software engineer'],
    no: ['not a programmer'],
  },
  is_photographer: {
    yes: ['photographer', 'a photographer'],
    no: ['not a photographer'],
  },
  is_singer: {
    yes: ['singer', 'a singer', 'musician'],
    no: ['not a singer'],
  },
  is_miner: {
    yes: ['miner', 'a miner'],
    no: ['not a miner'],
  },
  is_construction_worker: {
    yes: ['construction worker', 'builder', 'a builder', 'construction'],
    no: ['not a builder', 'not a construction worker'],
  },
  is_potter: {
    yes: ['potter', 'a potter', 'pottery'],
    no: ['not a potter'],
  },
  is_outdoors: {
    yes: ['outdoors', 'outside', 'out in nature', 'in the outdoors'],
    no: ['not outdoors', 'not outside'],
  },
  is_indoors: {
    yes: ['indoors', 'inside', 'indoor', 'in a room', 'inside a building'],
    no: ['not indoors', 'not inside'],
  },
  has_hearts: {
    yes: ['hearts', 'heart', 'floating hearts', 'heart floating', 'hearts floating', 'love hearts', 'heart shapes'],
    no: ['no hearts', 'without hearts'],
  },
  has_music_notes: {
    yes: ['music notes', 'music note', 'musical notes', 'notes floating', 'music symbols'],
    no: ['no music notes', 'without music notes'],
  },
  is_fancy_dressed: {
    yes: ['dressed up', 'fancy', 'elegant', 'formal', 'fancy dressed', 'sophisticated', 'classy', 'dapper'],
    no: ['not fancy', 'not dressed up', 'casual'],
  },
  is_traveling: {
    yes: ['traveling', 'travelling', 'on the move', 'moving', 'on a journey', 'on a trip', 'in transit'],
    no: ['not traveling', 'not travelling', 'staying still'],
  },
  holding_tool_or_prop: {
    yes: ['holding a tool', 'holding an object', 'holding object', 'holding something', 'carrying a tool', 'holding a prop', 'has a tool', 'holding an item', 'holding item'],
    no: ['not holding anything', 'empty handed', 'no tool'],
  },
  holding_shovel: {
    yes: ['shovel', 'holding a shovel', 'spade'],
    no: ['no shovel', 'without a shovel'],
  },
  holding_pickaxe: {
    yes: ['pickaxe', 'pick axe', 'holding a pickaxe'],
    no: ['no pickaxe', 'without a pickaxe'],
  },
  holding_spoon: {
    yes: ['spoon', 'holding a spoon', 'wooden spoon'],
    no: ['no spoon', 'without a spoon'],
  },
  holding_pan: {
    yes: ['frying pan', 'holding a pan', 'skillet'],
    no: ['no pan', 'without a pan'],
  },
  holding_clipboard: {
    yes: ['clipboard', 'holding a clipboard'],
    no: ['no clipboard', 'without a clipboard'],
  },
  holding_pitchfork: {
    yes: ['pitchfork', 'holding a pitchfork'],
    no: ['no pitchfork', 'without a pitchfork'],
  },
  holding_paintbrush: {
    yes: ['paintbrush', 'paint brush', 'holding a paintbrush'],
    no: ['no paintbrush', 'without a paintbrush'],
  },
  holding_mouse: {
    yes: ['computer mouse', 'holding a mouse'],
    no: ['no computer mouse'],
  },
  holding_microphone: {
    yes: ['microphone', 'a mic', 'holding a mic', 'holding a microphone'],
    no: ['no microphone', 'without a microphone'],
  },
  holding_trowel: {
    yes: ['trowel', 'holding a trowel'],
    no: ['no trowel', 'without a trowel'],
  },
  holding_racket: {
    yes: ['tennis racket', 'racket', 'racquet', 'holding a racket'],
    no: ['no racket', 'without a racket'],
  },
  holding_kite: {
    yes: ['kite', 'flying a kite', 'holding a kite'],
    no: ['no kite', 'without a kite'],
  },
  holding_jump_rope: {
    yes: ['jump rope', 'jumping rope', 'skipping rope'],
    no: ['no jump rope', 'without a jump rope'],
  },
  holding_walking_stick: {
    yes: ['walking stick', 'hiking stick', 'trekking pole'],
    no: ['no walking stick', 'without a walking stick'],
  },
  holding_cane: {
    yes: ['cane', 'holding a cane', 'walking cane'],
    no: ['no cane', 'without a cane'],
  },
  holding_basket: {
    yes: ['picnic basket', 'holding a basket', 'basket'],
    no: ['no basket', 'without a basket'],
  },
  holding_grocery_bag: {
    yes: ['grocery bag', 'paper bag', 'bag of groceries'],
    no: ['no grocery bag', 'without a grocery bag'],
  },
  holding_envelope: {
    yes: ['envelope', 'holding an envelope', 'holding a letter'],
    no: ['no envelope', 'without an envelope'],
  },
  holding_suitcase: {
    yes: ['suitcase', 'holding a suitcase', 'luggage', 'rolling suitcase'],
    no: ['no suitcase', 'without a suitcase'],
  },
  holding_briefcase: {
    yes: ['briefcase', 'holding a briefcase', 'work bag'],
    no: ['no briefcase', 'without a briefcase'],
  },
  holding_noisemaker: {
    yes: ['party horn', 'noisemaker', 'party blower', 'kazoo'],
    no: ['no noisemaker', 'without a noisemaker'],
  },
  holding_bubble_wand: {
    yes: ['bubble wand', 'holding a bubble wand'],
    no: ['no bubble wand', 'without a bubble wand'],
  },
  holding_chopsticks: {
    yes: ['chopsticks', 'holding chopsticks'],
    no: ['no chopsticks', 'without chopsticks'],
  },
  holding_photo_prop: {
    yes: ['photo prop', 'photobooth prop'],
    no: ['no photo prop'],
  },
  is_at_beach: {
    yes: ['beach', 'at the beach', 'sand', 'seaside', 'shore'],
    no: ['not at the beach', 'no beach'],
  },
  is_in_water: {
    yes: ['in water', 'swimming', 'in the water', 'bath', 'bathtub', 'pool', 'ocean', 'submerged'],
    no: ['not in water', 'dry'],
  },
  is_celebrating: {
    yes: ['celebrating', 'celebration', 'party', 'partying', 'festive'],
    no: ['not celebrating', 'no party'],
  },
  is_in_costume: {
    yes: ['costume', 'in costume', 'dressed as', 'disguise'],
    no: ['no costume', 'not in costume'],
  },
  has_hair: {
    yes: ['hair', 'hairy', 'hairstyle', 'has hair', 'hair on its head'],
    no: ['no hair', 'bald', 'hairless'],
  },
  eyes_open: {
    yes: ['eyes open', 'open eyes', 'awake'],
    no: ['eyes closed', 'closed eyes', 'sleeping eyes', 'eyes shut'],
  },
  is_sitting: {
    yes: ['sitting', 'seated', 'sitting down'],
    no: ['not sitting'],
  },
  is_standing: {
    yes: ['standing', 'standing up', 'upright', 'on its feet'],
    no: ['not standing'],
  },
  has_eyebrows: {
    yes: ['eyebrows', 'has eyebrows', 'brows'],
    no: ['no eyebrows', 'without eyebrows'],
  },
  hands_visible: {
    yes: ['hands', 'visible hands', 'can you see its hands', 'hands showing', 'arms and hands'],
    no: ['no hands', 'hands hidden', 'hands not visible'],
  },
  mouth_open: {
    yes: ['mouth open', 'open mouth', 'mouth is open', 'mouth agape'],
    no: ['mouth closed', 'closed mouth', 'mouth shut', 'mouth is closed'],
  },
  is_smiling: {
    yes: ['smiling', 'smile', 'grinning', 'grin'],
    no: ['not smiling', 'frowning', 'no smile', 'straight face'],
  },

  is_happy: {
    yes: ['happy', 'joyful', 'cheerful', 'glad', 'pleased'],
    no: ['not happy', 'unhappy'],
  },
  is_sad: {
    yes: ['sad', 'unhappy', 'depressed', 'feeling down'],
    no: ['not sad'],
  },
  is_angry: {
    yes: ['angry', 'mad', 'furious', 'annoyed look', 'irritated'],
    no: ['not angry'],
  },
  is_surprised: {
    yes: ['surprised', 'shocked', 'startled', 'wide eyed'],
    no: ['not surprised'],
  },
  is_confused: {
    yes: ['confused', 'puzzled', 'perplexed', 'baffled'],
    no: ['not confused'],
  },
  is_crying: {
    yes: ['crying', 'sobbing', 'weeping', 'in tears'],
    no: ['not crying'],
  },
  is_laughing: {
    yes: ['laughing', 'laugh', 'giggling', 'chuckling'],
    no: ['not laughing'],
  },
  is_winking: {
    yes: ['winking', 'wink'],
    no: ['not winking'],
  },
  is_blushing: {
    yes: ['blushing', 'blush', 'red cheeks', 'rosy cheeks'],
    no: ['not blushing'],
  },
  is_worried: {
    yes: ['worried', 'anxious', 'nervous', 'concerned'],
    no: ['not worried'],
  },
  is_sleepy: {
    yes: ['sleepy', 'tired', 'drowsy', 'yawning', 'yawn'],
    no: ['not sleepy', 'not tired'],
  },
  is_proud: {
    yes: ['proud', 'confident pose', 'triumphant'],
    no: ['not proud'],
  },
  is_shy: {
    yes: ['shy', 'bashful', 'timid'],
    no: ['not shy'],
  },
  is_jumping: {
    yes: ['jumping', 'jump', 'leaping', 'hopping'],
    no: ['not jumping'],
  },
  is_running: {
    yes: ['running', 'run', 'jogging', 'sprinting'],
    no: ['not running'],
  },
  is_dancing: {
    yes: ['dancing', 'dance'],
    no: ['not dancing'],
  },
  is_waving: {
    yes: ['waving', 'wave hello'],
    no: ['not waving'],
  },
  is_lying_down: {
    yes: ['lying down', 'laying down', 'lying flat'],
    no: ['not lying down'],
  },
  is_flying: {
    yes: ['flying', 'flies', 'hot air balloon', 'in a balloon', 'riding a balloon', 'in a hot air balloon'],
    no: ['not flying'],
  },
  is_stretching: {
    yes: ['stretching', 'stretch'],
    no: ['not stretching'],
  },
  is_climbing: {
    yes: ['climbing', 'climb'],
    no: ['not climbing'],
  },
  holding_umbrella: {
    yes: ['holding an umbrella', 'holding umbrella', 'has an umbrella'],
    no: ['no umbrella', 'without an umbrella'],
  },
  holding_phone: {
    yes: ['holding a phone', 'holding phone', 'has a phone', 'on the phone'],
    no: ['no phone', 'without a phone'],
  },
  holding_book: {
    yes: ['holding a book', 'holding book', 'reading a book', 'has a book'],
    no: ['no book', 'without a book'],
  },
  holding_camera: {
    yes: ['holding a camera', 'holding camera', 'has a camera', 'taking a photo'],
    no: ['no camera', 'without a camera'],
  },
  holding_musical_instrument: {
    yes: ['holding a musical instrument', 'playing an instrument', 'playing music', 'playing a song', 'has an instrument'],
    no: ['no instrument', 'without an instrument'],
  },
  holding_flower: {
    yes: ['holding a flower', 'holding flowers', 'has a flower'],
    no: ['no flower', 'without a flower'],
  },
  holding_drink: {
    yes: ['holding a drink', 'holding a cup', 'holding a mug', 'holding a glass'],
    no: ['no drink', 'without a drink'],
  },
  wearing_scarf: {
    yes: ['scarf', 'wearing a scarf'],
    no: ['no scarf', 'without a scarf'],
  },
  wearing_shoes: {
    yes: ['shoes', 'boots', 'wearing shoes'],
    no: ['no shoes', 'barefoot', 'without shoes'],
  },
  wearing_bowtie: {
    yes: ['bow tie', 'bowtie'],
    no: ['no bow tie', 'without a bow tie'],
  },
  is_at_home: {
    yes: ['at home', 'in a house'],
    no: ['not at home'],
  },
  is_in_bathroom: {
    yes: ['bathroom', 'in the bathroom'],
    no: ['not in the bathroom'],
  },
  is_on_mountain: {
    yes: ['mountain', 'mountains', 'on a mountain'],
    no: ['not on a mountain'],
  },
  is_in_garden: {
    yes: ['garden', 'backyard', 'in the garden'],
    no: ['not in the garden'],
  },
  is_winter_themed: {
    yes: ['winter themed', 'christmas themed', 'holiday themed', 'santa hat'],
    no: ['not winter themed'],
  },
  teeth_showing: {
    yes: ['teeth', 'showing teeth', 'teeth showing'],
    no: ['no teeth showing'],
  },
  tongue_out: {
    yes: ['tongue out', 'tongue sticking out', 'sticking its tongue out'],
    no: ['tongue not out'],
  },
  eyes_wide_open: {
    yes: ['eyes wide open', 'wide eyes', 'big eyes'],
    no: ['eyes not wide open'],
  },
  one_eye_closed: {
    yes: ['one eye closed', 'one eye shut'],
    no: ['both eyes open'],
  },
  has_bubbles: {
    yes: ['bubbles', 'bubble', 'soap bubbles', 'floating bubbles'],
    no: ['no bubbles'],
  },
  is_determined: {
    yes: ['determined', 'determined look', 'focused look', 'gritty determination'],
    no: ['not determined'],
  },
};

const COLOR_KEYWORDS = {
  yellow: ['yellow', 'gold', 'golden'],
  green: ['green'],
  blue: ['blue'],
  olive: ['olive', 'khaki'],
  pink: ['pink', 'mauve', 'rose'],
  brown: ['brown', 'tan'],
  red: ['red', 'coral'],
  orange: ['orange'],
  teal: ['teal', 'dark blue green', 'blue green', 'sea green'],
  purple: ['purple', 'lavender', 'violet'],
  gray: ['gray', 'grey', 'white'],
  beige: ['beige', 'light tan', 'cream'],
};

// "is the hat yellow" mentions a color word and a hat word, but it's asking
// about one thing (the hat's color), not two ("is it yellow" + "is it
// wearing a hat"). These compound phrases are added as their own longer
// candidates so they win over the separate color/wearing_hat matches instead
// of the question getting flagged as multiple.
const HAT_WORDS = ['hat', 'cap', 'beanie'];

let _candidates = null;
let _singleWordCandidates = null;

function _escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _buildCandidates() {
  const list = [];

  Object.keys(ATTRIBUTE_KEYWORDS).forEach((attribute) => {
    const { yes = [], no = [] } = ATTRIBUTE_KEYWORDS[attribute];
    yes.forEach((phrase) => list.push({ attribute, value: true, phrase }));
    no.forEach((phrase) => list.push({ attribute, value: false, phrase }));
  });

  Object.keys(COLOR_KEYWORDS).forEach((color) => {
    COLOR_KEYWORDS[color].forEach((phrase) => list.push({ attribute: 'color', value: color, phrase }));
  });

  Object.keys(COLOR_KEYWORDS).forEach((color) => {
    COLOR_KEYWORDS[color].forEach((colorPhrase) => {
      HAT_WORDS.forEach((hatWord) => {
        list.push({ attribute: 'hat_color', value: color, phrase: `${colorPhrase} ${hatWord}` });
        list.push({ attribute: 'hat_color', value: color, phrase: `${hatWord} ${colorPhrase}` });
      });
    });
  });

  list.forEach((candidate) => {
    const words = candidate.phrase.split(' ');
    candidate.wordCount = words.length;
    candidate.regex = new RegExp(`\\b${words.map(_escapeRegex).join('\\s+')}\\b`);
  });

  list.sort((a, b) => b.wordCount - a.wordCount);
  return list;
}

function _normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Catches generic negation ("does it not have glasses") that isn't spelled out
// verbatim in an attribute's `no` phrase list. Intentionally narrow (looks only
// a few words back) rather than full negation parsing.
const NEGATION_WORDS = new Set(['not', 'no', 'never', 'without', 't']);

function _hasNegationBefore(normalized, matchIndex) {
  const before = normalized.slice(0, matchIndex).trim();
  if (!before) return false;
  const words = before.split(' ');
  return words.slice(-3).some((w) => NEGATION_WORDS.has(w));
}

// Typo tolerance: only for single-word keywords, and only kicks in once exact
// phrase matching has completely failed. Tolerance scales with word length so
// short words ("no", "art") can't fuzzy-match into something unrelated.
function _typoThreshold(len) {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

function _levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function _wordsWithIndices(text) {
  const words = [];
  const re = /\S+/g;
  let match;
  while ((match = re.exec(text))) {
    words.push({ word: match[0], index: match.index });
  }
  return words;
}

// Words that must never be treated as a typo of some keyword, no matter how
// close the edit distance — they're the game's own vocabulary, so they show
// up constantly in real questions (e.g. "blute" is 1 edit from "blue").
const FUZZY_IGNORE_WORDS = new Set(['blute', 'blutes', 'holding', 'carrying']);

function _fuzzyMatch(normalized) {
  let best = null;

  for (const { word, index } of _wordsWithIndices(normalized)) {
    if (FUZZY_IGNORE_WORDS.has(word)) continue;
    const threshold = _typoThreshold(word.length);
    if (threshold === 0) continue;

    for (const candidate of _singleWordCandidates) {
      if (Math.abs(word.length - candidate.phrase.length) > threshold) continue;
      const dist = _levenshtein(word, candidate.phrase);
      if (dist <= threshold && (!best || dist < best.dist)) {
        best = { dist, candidate, index };
      }
    }
  }

  return best;
}

function interpretQuestion(rawText) {
  if (!_candidates) {
    _candidates = _buildCandidates();
    _singleWordCandidates = _candidates.filter((c) => c.wordCount === 1);
  }

  const normalized = _normalize(rawText || '');
  if (!normalized) return { ok: false };

  // Scan every candidate (not just the first hit) so a question that touches
  // two different attributes ("is it yellow and wearing a hat") can be caught
  // as a compound question rather than silently answering only the first.
  // _candidates is sorted longest-phrase-first, so accepting matches in that
  // order and skipping anything whose span overlaps an already-accepted match
  // means a shorter phrase that's merely part of a longer one already claimed
  // (e.g. "mask" inside "eye mask", "playing" inside "playing an instrument")
  // doesn't get miscounted as a second, unrelated question.
  const matches = [];
  for (const candidate of _candidates) {
    const match = candidate.regex.exec(normalized);
    if (!match) continue;

    const start = match.index;
    const end = start + match[0].length;
    const overlapsAccepted = matches.some((m) => start < m.end && end > m.start);
    if (overlapsAccepted) continue;

    matches.push({ candidate, index: start, start, end });
  }

  // Two matches can share an attribute but still be a compound question if
  // they disagree on value ("is it red or green?" — both `color`, but can't
  // both be true). Synonyms of the same value ("olive or khaki") land in the
  // same set and are correctly left alone.
  const valuesByAttribute = new Map();
  matches.forEach((m) => {
    const { attribute, value } = m.candidate;
    if (!valuesByAttribute.has(attribute)) valuesByAttribute.set(attribute, new Set());
    valuesByAttribute.get(attribute).add(value);
  });

  const distinctAttributes = valuesByAttribute.size;
  const hasConflictingValues = Array.from(valuesByAttribute.values()).some((vals) => vals.size > 1);

  if (distinctAttributes > 1 || hasConflictingValues) {
    return { ok: false, reason: 'multiple' };
  }

  if (matches.length > 0) {
    // _candidates is sorted by phrase length descending, and matches preserves
    // that order, so the first entry is already the most specific phrase.
    const { candidate, index } = matches[0];
    let { value } = candidate;
    if (candidate.attribute !== 'color' && value === true && _hasNegationBefore(normalized, index)) {
      value = false;
    }
    return { ok: true, attribute: candidate.attribute, value, matchedPhrase: candidate.phrase };
  }

  const fuzzy = _fuzzyMatch(normalized);
  if (fuzzy) {
    let { value } = fuzzy.candidate;
    if (fuzzy.candidate.attribute !== 'color' && value === true && _hasNegationBefore(normalized, fuzzy.index)) {
      value = false;
    }
    return { ok: true, attribute: fuzzy.candidate.attribute, value, matchedPhrase: fuzzy.candidate.phrase };
  }

  return { ok: false };
}
