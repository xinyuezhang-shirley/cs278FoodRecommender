import { createContext } from 'react';
import type { PostKindFilter } from '../types/filters';
import type { MapFilters, MapAdvancedFiltersPatch } from '../types/mapFilters';

export interface NommiFilterContextValue {
  filters: MapFilters;
  setSearch: (search: string) => void;
  setPostKind: (post_kind: PostKindFilter) => void;
  setFoodCategories: (food_categories: string[]) => void;
  setDietary: (dietary: string[]) => void;
  setDistance: (distance: string) => void;
  setOpenNow: (openNow: string) => void;
  setRating: (rating: string) => void;
  setSortBy: (sortBy: 'recent' | 'popular') => void;
  setPhotosOnly: (photosOnly: boolean) => void;
  setCampusOnly: (campusOnly: boolean) => void;
  clearAll: () => void;
  /** Merge advanced sheet fields (immediate apply). */
  patchAdvancedFilters: (patch: Partial<MapAdvancedFiltersPatch>) => void;
  resetAdvancedFilters: () => void;
}

export const NommiFilterContext = createContext<NommiFilterContextValue | null>(null);
