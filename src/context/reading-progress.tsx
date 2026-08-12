import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type Sentence = { sentence_no: number; sentense_detail: string; highlighted?: boolean; color?: string };
export type Chapter = { chapter_no: number; chapter_title: string; marked_as_read?: boolean; sentences: Sentence[] };
type Book = { title_guess: string | null; source_guess?: { chapters?: Chapter[] } };

const library = require('../../assets/json/grand_with_chapters.json') as Book[];
export const books = library.filter((book) => book.title_guess && book.source_guess?.chapters?.length);
type ProgressContextValue = {
  isRead: (bookIndex: number, chapterNo: number) => boolean;
  toggleRead: (bookIndex: number, chapterNo: number) => void;
  highlight: (bookIndex: number, chapterNo: number, sentenceNo: number, color: string) => void;
  getHighlight: (bookIndex: number, chapterNo: number, sentenceNo: number) => string | undefined;
  totals: { chapters: number; sentences: number; completed: number; highlighted: number };
};
const ReadingProgressContext = createContext<ProgressContextValue | null>(null);

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const [readChapters, setReadChapters] = useState<Record<string, boolean>>({});
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const key = (bookIndex: number, chapterNo: number, sentenceNo?: number) => `${bookIndex}:${chapterNo}${sentenceNo ? `:${sentenceNo}` : ''}`;
  const totals = useMemo(() => {
    const chapters = books.flatMap((book) => book.source_guess?.chapters ?? []);
    return { chapters: chapters.length, sentences: chapters.reduce((sum, chapter) => sum + chapter.sentences.length, 0), completed: Object.values(readChapters).filter(Boolean).length, highlighted: Object.keys(highlights).length };
  }, [readChapters, highlights]);
  const value = useMemo(() => ({
    isRead: (bookIndex: number, chapterNo: number) => Boolean(readChapters[key(bookIndex, chapterNo)]),
    toggleRead: (bookIndex: number, chapterNo: number) => setReadChapters((current) => ({ ...current, [key(bookIndex, chapterNo)]: !current[key(bookIndex, chapterNo)] })),
    highlight: (bookIndex: number, chapterNo: number, sentenceNo: number, color: string) => setHighlights((current) => ({ ...current, [key(bookIndex, chapterNo, sentenceNo)]: color })),
    getHighlight: (bookIndex: number, chapterNo: number, sentenceNo: number) => highlights[key(bookIndex, chapterNo, sentenceNo)],
    totals,
  }), [readChapters, highlights, totals]);
  return <ReadingProgressContext.Provider value={value}>{children}</ReadingProgressContext.Provider>;
}
export function useReadingProgress() {
  const value = useContext(ReadingProgressContext);
  if (!value) throw new Error('useReadingProgress must be used within ReadingProgressProvider');
  return value;
}
