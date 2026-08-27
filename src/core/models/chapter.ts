import type { Sentence } from './sentence';

export type Chapter = {
  chapter_no: number;
  chapter_title: string;
  sentences: Sentence[];
};
