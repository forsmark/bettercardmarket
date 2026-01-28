const excludedExpansions = [
  //Ugly
  "Universes Beyond",
  "Extras",
  "Retro",
  //Expensive
  "Secret Lair",
  "Promo",
  "Summer Magic",
  "Alpha",
  "Beta",
  "Unlimited",
  //Weird
  "Mystery Booster",
  "The List",
  "WCD",
  "Anniversary",
  "Pro Tour",
  "International",
  //White Borders
  "Revised",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Chronicles",
  "Anthologies",
  "Beatdown",
  "Battle Royale",
  "Collectors",
  //Foreign
  "Foreign White Border",
  "Foreign Black Border",
  "Japanese",
];

const backgroundPositionRegex =
  /background-position:\s*([-\d.]+px)\s+([-\d.]+px);/;

const LOG_PREFIX = "[BetterCardMarket AutoList]";
