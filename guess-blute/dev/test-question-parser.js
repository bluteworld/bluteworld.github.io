// Dev-only coverage checker for question-parser.js's interpretQuestion().
// Not loaded by index.html. Run with: node dev/test-question-parser.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'question-parser.js'), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const { interpretQuestion } = sandbox;

// Each case: [typed question, expected attribute, expected value]
const cases = [
  // Regression case that motivated this whole rewrite.
  ['is the blute green?', 'color', 'green'],
  ['is it green?', 'color', 'green'],

  // Colors
  ['is it yellow', 'color', 'yellow'],
  ['is it gold colored', 'color', 'yellow'],
  ['is the blute blue', 'color', 'blue'],
  ['is it olive or khaki', 'color', 'olive'],
  ['is it khaki colored', 'color', 'olive'],
  ['is it pink', 'color', 'pink'],
  ['is it mauve', 'color', 'pink'],
  ['is it brown', 'color', 'brown'],
  ['is it tan', 'color', 'brown'],
  ['is it a light tan color', 'color', 'beige'],
  ['is it beige', 'color', 'beige'],
  ['is it red', 'color', 'red'],
  ['is it coral colored', 'color', 'red'],
  ['is it orange', 'color', 'orange'],
  ['is it teal', 'color', 'teal'],
  ['is it dark blue green', 'color', 'teal'],
  ['is it purple', 'color', 'purple'],
  ['is it lavender', 'color', 'purple'],
  ['is it gray', 'color', 'gray'],
  ['is it grey', 'color', 'gray'],
  ['is it white', 'color', 'gray'],
  ['is it cream colored', 'color', 'beige'],

  // wearing_glasses
  ['is it wearing glasses', 'wearing_glasses', true],
  ['does it have glasses on', 'wearing_glasses', true],
  ['is it wearing an eye mask', 'wearing_glasses', true],
  ['does it not have glasses', 'wearing_glasses', false],
  ['no glasses right', 'wearing_glasses', false],

  // wearing_hat
  ['is it wearing a hat', 'wearing_hat', true],
  ['does it have a cap on', 'wearing_hat', true],
  ['is it hatless', 'wearing_hat', false],
  ['is it wearing no hat', 'wearing_hat', false],

  // has_mustache
  ['does it have a mustache', 'has_mustache', true],
  ['does it have a moustache', 'has_mustache', true],
  ['is it clean shaven', 'has_mustache', false],

  // wearing_clothing
  ['is it wearing clothes', 'wearing_clothing', true],
  ['does it have an outfit on', 'wearing_clothing', true],
  ['is it naked', 'wearing_clothing', false],

  // with_animal
  ['is there an animal with it', 'with_animal', true],
  ['does it have a pet', 'with_animal', true],
  ['is there a dog in the picture', 'with_animal', true],
  ['is it alone with no pet', 'with_animal', false],

  // is_eating_or_drinking
  ['is it eating something', 'is_eating_or_drinking', true],
  ['is it drinking', 'is_eating_or_drinking', true],
  ['is it not eating', 'is_eating_or_drinking', false],

  // holding_food
  ['is it holding food', 'holding_food', true],
  ['is it carrying food', 'holding_food', true],
  ['is it holding no food', 'holding_food', false],

  // is_doing_sport (collision case with is_working)
  ['is it doing a sport', 'is_doing_sport', true],
  ['is it working out', 'is_doing_sport', true],
  ['is it exercising', 'is_doing_sport', true],

  // is_working (should NOT be caught by "working out")
  ['is it working', 'is_working', true],
  ['does it have a job', 'is_working', true],
  ['is it not working', 'is_working', false],

  // is_doing_creative
  ['is it being creative', 'is_doing_creative', true],
  ['is it painting', 'is_doing_creative', true],

  // is_relaxing
  ['is it relaxing', 'is_relaxing', true],
  ['is it chilling out', 'is_relaxing', true],

  // is_outdoors / is_indoors (should not collide)
  ['is it outdoors', 'is_outdoors', true],
  ['is it outside', 'is_outdoors', true],
  ['is it indoors', 'is_indoors', true],
  ['is it inside', 'is_indoors', true],

  // has_hearts
  ['are there hearts around it', 'has_hearts', true],
  ['is there a heart floating', 'has_hearts', true],

  // has_music_notes
  ['are there music notes', 'has_music_notes', true],

  // is_fancy_dressed (collision case with wearing_clothing "dressed")
  ['is it dressed up fancy', 'is_fancy_dressed', true],
  ['is it elegant', 'is_fancy_dressed', true],
  ['is it dressed', 'wearing_clothing', true],

  // is_traveling
  ['is it traveling', 'is_traveling', true],
  ['is it on the move', 'is_traveling', true],

  // holding_tool_or_prop
  ['is it holding a tool', 'holding_tool_or_prop', true],
  ['is it holding an object', 'holding_tool_or_prop', true],
  ['holding object?', 'holding_tool_or_prop', true],

  // is_at_beach
  ['is it at the beach', 'is_at_beach', true],
  ['is it on the sand', 'is_at_beach', true],

  // is_in_water
  ['is it in water', 'is_in_water', true],
  ['is it swimming', 'is_in_water', true],
  ['is it in a bathtub', 'is_in_water', true],

  // is_celebrating
  ['is it celebrating', 'is_celebrating', true],
  ['is it at a party', 'is_celebrating', true],

  // is_in_costume
  ['is it wearing a costume', 'is_in_costume', true],
  ['is it in costume', 'is_in_costume', true],

  // has_hair
  ['does it have hair', 'has_hair', true],
  ['is it bald', 'has_hair', false],

  // eyes_open
  ['are its eyes open', 'eyes_open', true],
  ['are its eyes closed', 'eyes_open', false],

  // is_sitting / is_standing
  ['is it sitting', 'is_sitting', true],
  ['is it sitting down', 'is_sitting', true],
  ['is it standing', 'is_standing', true],
  ['is it standing up', 'is_standing', true],

  // has_eyebrows
  ['does it have eyebrows', 'has_eyebrows', true],

  // hands_visible
  ['can you see its hands', 'hands_visible', true],
  ['are its hands visible', 'hands_visible', true],
  ['are its hands hidden', 'hands_visible', false],

  // mouth_open
  ['is its mouth open', 'mouth_open', true],
  ['is its mouth closed', 'mouth_open', false],

  // is_smiling
  ['is it smiling', 'is_smiling', true],
  ['is it grinning', 'is_smiling', true],
  ['is it frowning', 'is_smiling', false],

  // newly added attributes (previously unanswerable questions from playtesting)
  ['is it angry', 'is_angry', true],
  ['is it yawning', 'is_sleepy', true],
  ['does it look happy', 'is_happy', true],
  ['is it sad', 'is_sad', true],
  ['is it confused', 'is_confused', true],
  ['is it crying', 'is_crying', true],
  ['is it jumping', 'is_jumping', true],
  ['is it running', 'is_running', true],
  ['is it dancing', 'is_dancing', true],
  ['is it climbing', 'is_climbing', true],
  ['is it holding an umbrella', 'holding_umbrella', true],
  ['is it holding a camera', 'holding_camera', true],
  ['is it playing an instrument', 'holding_musical_instrument', true],
  ['is it wearing a bow tie', 'wearing_bowtie', true],
  ['is it in a bathroom', 'is_in_bathroom', true],
  ['is it on a mountain', 'is_on_mountain', true],
  ['is it winter themed', 'is_winter_themed', true],
  ['bubbles', 'has_bubbles', true],
  ['is it in a balloon', 'is_flying', true],
  ['does it look determined', 'is_determined', true],

  // typo tolerance (fuzzy fallback)
  ['is it yelow', 'color', 'yellow'],
  ['is it yello', 'color', 'yellow'],
  ['is it standin', 'is_standing', true],
  ['does it have a hatt', 'wearing_hat', true],
  ['is it realxing', 'is_relaxing', true],
  ['is it beach', 'is_at_beach', true],
];

// Genuinely compound questions (two distinct attributes) that must be
// rejected with reason: 'multiple' rather than silently answering only one.
const multiQuestionCases = [
  'is it yellow and wearing a hat',
  'is it happy and holding a book',
  'is it sitting and confused',
  'is it red or green',
  'is it blue or purple',
];

// Phrasings where a shorter keyword incidentally sits inside a longer,
// higher-priority phrase for a DIFFERENT attribute — must NOT be flagged as
// multiple (the overlap-dedup logic should suppress the shorter one).
const overlapNotMultiCases = [
  ['is it wearing an eye mask', 'wearing_glasses', true],
  ['is it working out', 'is_doing_sport', true],
  ['is it dressed up fancy', 'is_fancy_dressed', true],
  ['is it playing an instrument', 'holding_musical_instrument', true],
  ['is there a heart floating', 'has_hearts', true],
];

// Words the fuzzy-typo fallback must never "correct" into an unrelated
// keyword, because they're the game's own vocabulary and show up constantly
// in real questions (e.g. "blute" is edit-distance 1 from "blue").
const shouldBeUnanswerable = [
  'which blute is the right one?',
  'who is the secret blute?',
  'holding',
];

let pass = 0;
let total = cases.length + multiQuestionCases.length + overlapNotMultiCases.length + shouldBeUnanswerable.length;
const failures = [];

for (const [text, expectedAttr, expectedValue] of cases) {
  const result = interpretQuestion(text);
  const ok = result.ok && result.attribute === expectedAttr && result.value === expectedValue;
  if (ok) {
    pass += 1;
  } else {
    failures.push({ text, expectedAttr, expectedValue, got: result });
  }
}

for (const text of multiQuestionCases) {
  const result = interpretQuestion(text);
  const ok = !result.ok && result.reason === 'multiple';
  if (ok) {
    pass += 1;
  } else {
    failures.push({ text, expectedAttr: 'reason=multiple', expectedValue: '', got: result });
  }
}

for (const [text, expectedAttr, expectedValue] of overlapNotMultiCases) {
  const result = interpretQuestion(text);
  const ok = result.ok && result.attribute === expectedAttr && result.value === expectedValue;
  if (ok) {
    pass += 1;
  } else {
    failures.push({ text, expectedAttr, expectedValue, got: result });
  }
}

for (const text of shouldBeUnanswerable) {
  const result = interpretQuestion(text);
  if (!result.ok) {
    pass += 1;
  } else {
    failures.push({ text, expectedAttr: 'ok:false', expectedValue: '', got: result });
  }
}

console.log(`${pass}/${total} passed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => {
    console.log(
      `  "${f.text}" -> expected (${f.expectedAttr}, ${f.expectedValue}), got ${JSON.stringify(f.got)}`
    );
  });
  process.exitCode = 1;
}
