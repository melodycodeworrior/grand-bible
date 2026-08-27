import type { Category, Entity } from '@/core/models';

export type EditorState = {
  mode: 'edit' | 'add';
  category: Category;
  entity?: Entity;
};

export type CategoryEditorState = {
  category?: Category;
};
