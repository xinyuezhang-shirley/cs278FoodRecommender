import type { PostKindFilter } from './filters';

export interface MapFilters {
  search: string;
  /** Exclusive shortcut: All (`''`) vs free-food vs rec vs event — separate from category chips. */
  post_kind: PostKindFilter;
  /** Food categories/tags (preset + Other). OR semantics; empty = no category constraint. */
  food_categories: string[];
  dietary: string[];
  distance: string;
  openNow: string;
  rating: string;
  sortBy: 'recent' | 'popular';
  photosOnly: boolean;
  campusOnly: boolean;
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  search: '',
  post_kind: '',
  food_categories: [],
  dietary: [],
  distance: '',
  openNow: '',
  rating: '',
  sortBy: 'recent',
  photosOnly: false,
  campusOnly: false,
};

/** Advanced sheet only — no search, categories, sort, post kind */
export type MapAdvancedFiltersPatch = Pick<
  MapFilters,
  'dietary' | 'distance' | 'openNow' | 'rating' | 'photosOnly' | 'campusOnly'
>;

export const EMPTY_ADVANCED_FILTERS: MapAdvancedFiltersPatch = {
  dietary: [],
  distance: '',
  openNow: '',
  rating: '',
  photosOnly: false,
  campusOnly: false,
};
