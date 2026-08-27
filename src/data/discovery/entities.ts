import type { Category, SpiritualEntitiesMetadata } from '@/core/models';

export const spiritualEntities = require('../../../assets/json/spiritual_entities.json') as {
  metadata: SpiritualEntitiesMetadata;
  categories: Category[];
};
