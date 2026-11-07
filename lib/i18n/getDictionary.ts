import "server-only";
import bn from "./dictionaries/bn";
import en from "./dictionaries/en";
import type { Locale } from "./config";

const dictionaries = { bn, en };

export const getDictionary = (lang: Locale) => dictionaries[lang];
export type { Dictionary } from "./dictionaries/bn";
