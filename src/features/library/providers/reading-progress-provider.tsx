import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore/lite';

import { db } from '@/config/firebase';
import type { Highlight, RecentBook } from '@/core/models';
import { books } from '@/data/library/books';
import { useAuth } from '@/features/auth/providers/auth-provider';

type ProgressContextValue = {
  highlights: Highlight[];
  highlightsLoading: boolean;
  highlightsError: string | null;
  recentBook: RecentBook | null;
  recentBookLoading: boolean;
  isRead: (bookIndex: number, chapterNo: number) => boolean;
  toggleRead: (bookIndex: number, chapterNo: number) => void;
  highlight: (bookIndex: number, chapterNo: number, sentenceNo: number, color: string) => Promise<void>;
  saveRecentBook: (bookIndex: number, chapterNo: number, sentenceNo: number) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
  getHighlight: (bookIndex: number, chapterNo: number, sentenceNo: number) => string | undefined;
  totals: { chapters: number; sentences: number; completed: number; highlighted: number };
};

const ReadingProgressContext = createContext<ProgressContextValue | null>(null);
const highlightKey = (bookIndex: number, chapterNo: number, sentenceNo?: number) =>
  `${bookIndex}:${chapterNo}${sentenceNo === undefined ? '' : `:${sentenceNo}`}`;
const recentBookId = (uid: string) => `${uid}_recentBook`;

function toRecentBook(id: string, data: Record<string, unknown>): RecentBook {
  return {
    id,
    bookIndex: Number(data.bookIndex),
    bookTitle: String(data.bookTitle ?? 'Untitled book'),
    chapterNo: Number(data.chapterNo),
    chapterTitle: String(data.chapterTitle ?? 'Untitled chapter'),
    sentenceNo: Number(data.sentenceNo),
    sentenceText: String(data.sentenceText ?? ''),
  };
}

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [readChapters, setReadChapters] = useState<Record<string, boolean>>({});
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [recentBook, setRecentBook] = useState<RecentBook | null>(null);
  const [recentBookLoading, setRecentBookLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      queueMicrotask(() => {
        if (!cancelled) {
          setHighlights([]);
          setHighlightsError(null);
          setRecentBook(null);
          setRecentBookLoading(false);
        }
      });
      return;
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setHighlightsLoading(true);
        setHighlightsError(null);
        setRecentBookLoading(true);
      }
    });
    void Promise.all([
      getDocs(query(collection(db, 'highlighted'), where('uid', '==', user.uid))),
      getDoc(doc(db, 'recentBooks', recentBookId(user.uid))),
    ])
      .then(([highlightsSnapshot, recentSnapshot]) => {
        if (cancelled) return;
        setHighlights(
          highlightsSnapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as Highlight,
          ),
        );
        setRecentBook(
          recentSnapshot.exists()
            ? toRecentBook(recentSnapshot.id, recentSnapshot.data())
            : null,
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.log('Could not load highlights:', error);
        setHighlightsError('Your saved marks could not be loaded. Check Firestore permissions.');
        setRecentBook(null);
      })
      .finally(() => {
        if (!cancelled) {
          setHighlightsLoading(false);
          setRecentBookLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const totals = useMemo(() => {
    const chapters = books.flatMap((book) => book.source_guess?.chapters ?? []);
    return {
      chapters: chapters.length,
      sentences: chapters.reduce((sum, chapter) => sum + chapter.sentences.length, 0),
      completed: Object.values(readChapters).filter(Boolean).length,
      highlighted: highlights.length,
    };
  }, [highlights.length, readChapters]);

  const value = useMemo<ProgressContextValue>(() => ({
    highlights,
    highlightsLoading,
    highlightsError,
    recentBook,
    recentBookLoading,
    isRead: (bookIndex, chapterNo) => Boolean(readChapters[highlightKey(bookIndex, chapterNo)]),
    toggleRead: (bookIndex, chapterNo) => setReadChapters((current) => ({
      ...current,
      [highlightKey(bookIndex, chapterNo)]: !current[highlightKey(bookIndex, chapterNo)],
    })),
    highlight: async (bookIndex, chapterNo, sentenceNo, color) => {
      if (!user) throw new Error('Sign in to save highlights.');
      const book = books[bookIndex];
      const chapter = book?.source_guess?.chapters?.find((item) => item.chapter_no === chapterNo);
      const sentence = chapter?.sentences.find((item) => item.sentence_no === sentenceNo);
      if (!book || !chapter || !sentence) throw new Error('This sentence could not be found.');

      const id = `${user.uid}_${bookIndex}_${chapterNo}_${sentenceNo}`;
      const next: Highlight = {
        id,
        bookIndex,
        bookTitle: book.title_guess ?? 'Untitled book',
        chapterNo,
        chapterTitle: chapter.chapter_title || 'Untitled chapter',
        sentenceNo,
        sentenceText: sentence.sentense_detail,
        color,
      };
      await setDoc(doc(db, 'highlighted', id), { ...next, uid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      setHighlights((current) => [...current.filter((item) => item.id !== id), next]);
    },
    saveRecentBook: async (bookIndex, chapterNo, sentenceNo) => {
      if (!user) throw new Error('Sign in to save reading position.');
      const book = books[bookIndex];
      const chapter = book?.source_guess?.chapters?.find((item) => item.chapter_no === chapterNo);
      const sentence = chapter?.sentences.find((item) => item.sentence_no === sentenceNo);
      if (!book || !chapter || !sentence) throw new Error('This chapter could not be found.');

      const id = recentBookId(user.uid);
      const next: RecentBook = {
        id,
        bookIndex,
        bookTitle: book.title_guess ?? 'Untitled book',
        chapterNo,
        chapterTitle: chapter.chapter_title || 'Untitled chapter',
        sentenceNo,
        sentenceText: sentence.sentense_detail,
      };
      await setDoc(
        doc(db, 'recentBooks', id),
        { ...next, uid: user.uid, updatedAt: serverTimestamp() },
        { merge: true },
      );
      setRecentBook(next);
    },
    removeHighlight: async (id) => {
      if (!user) throw new Error('Sign in to remove highlights.');
      await deleteDoc(doc(db, 'highlighted', id));
      setHighlights((current) => current.filter((item) => item.id !== id));
    },
    getHighlight: (bookIndex, chapterNo, sentenceNo) =>
      highlights.find((item) => item.bookIndex === bookIndex && item.chapterNo === chapterNo && item.sentenceNo === sentenceNo)?.color,
    totals,
  }), [highlights, highlightsError, highlightsLoading, readChapters, recentBook, recentBookLoading, totals, user]);

  return <ReadingProgressContext.Provider value={value}>{children}</ReadingProgressContext.Provider>;
}

export function useReadingProgress() {
  const value = useContext(ReadingProgressContext);
  if (!value) throw new Error('useReadingProgress must be used within ReadingProgressProvider');
  return value;
}
