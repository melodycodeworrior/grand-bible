import type { Entity } from './entity';

export type Category = {
  category: string;
  description: string;
  entities: Entity[];
};

export type SpiritualEntitiesMetadata = {
  title?: string;
  compiler_reference?: string;
  description?: string;
};
