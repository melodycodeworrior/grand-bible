import type { Book } from '@/core/models';

export const library = require('../../../assets/json/grand_with_chapters.json') as Book[];

export const books = library.filter(
  (book) => book.title_guess && book.source_guess?.chapters?.length,
);
