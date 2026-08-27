import type { Chapter } from './chapter';

export type Book = {
  title_guess: string | null;
  source_guess?: { chapters?: Chapter[] };
};
