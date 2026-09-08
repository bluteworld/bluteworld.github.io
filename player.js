// One player identity for the whole of Blute World.
//
// Each game used to mint its own UUID, so the same person showed up as two
// unrelated players across Guess Blute and Slip n Slide. Everything now reads
// from a single pair of keys, and any game added later gets the same person
// for free by loading this file.
//
// This is deliberately not an account: the identity lives in localStorage, so
// it is per-browser and cannot be carried to another device or recovered once
// cleared. Real accounts would replace the storage here, not the callers.

const PLAYER_UUID_KEY = 'bluteWorldUUID';
const PLAYER_NAME_KEY = 'bluteWorldName';

// Per-game keys from before the identity was shared, newest-value-first. A
// returning player must keep the UUID their existing scores are filed under,
// so Guess Blute comes first: it is the game with a leaderboard history and a
// 'me' highlight that would break if the UUID changed underneath it.
const LEGACY_UUID_KEYS = ['guessBluteUUID', 'slipNSlideUUID'];
const LEGACY_NAME_KEYS = ['guessBluteName'];

// Legacy keys are read but never cleared. They cost nothing to leave behind,
// and keeping them means a browser that runs an older cached copy of a game
// still finds the identity it expects.
function adoptLegacy(key, legacyKeys) {
  for (const legacyKey of legacyKeys) {
    const value = localStorage.getItem(legacyKey);
    if (value) {
      localStorage.setItem(key, value);
      return value;
    }
  }
  return null;
}

function getPlayerUUID() {
  let uuid = localStorage.getItem(PLAYER_UUID_KEY);
  if (uuid) return uuid;

  uuid = adoptLegacy(PLAYER_UUID_KEY, LEGACY_UUID_KEYS);
  if (uuid) return uuid;

  uuid = crypto.randomUUID();
  localStorage.setItem(PLAYER_UUID_KEY, uuid);
  return uuid;
}

function getPlayerName() {
  const name = localStorage.getItem(PLAYER_NAME_KEY);
  if (name !== null) return name;
  return adoptLegacy(PLAYER_NAME_KEY, LEGACY_NAME_KEYS) || '';
}

// A name is optional everywhere, so blank is a value a player can choose and
// is stored as one rather than falling back to a legacy name on the next read.
function setPlayerName(name) {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}
