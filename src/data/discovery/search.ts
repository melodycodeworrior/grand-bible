import type { SearchResult } from '@/core/models';

export type SearchStore = {
  generated_from: string;
  generated_at?: string;
  results: Record<string, SearchResult[]>;
};

export const initialSearch = require('../../../assets/json/grand_search.json') as SearchStore;
