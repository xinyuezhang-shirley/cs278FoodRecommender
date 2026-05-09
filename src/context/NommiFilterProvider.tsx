import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PostKindFilter } from '../types/filters';
import {
  type MapFilters,
  type MapAdvancedFiltersPatch,
  DEFAULT_MAP_FILTERS,
  EMPTY_ADVANCED_FILTERS,
} from '../types/mapFilters';
import { NommiFilterContext } from './nommiFiltersContext';

export function NommiFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);

  const setSearch = useCallback((search: string) => {
    setFilters(f => ({ ...f, search }));
  }, []);

  const setPostKind = useCallback((post_kind: PostKindFilter) => {
    setFilters(f => ({ ...f, post_kind }));
  }, []);

  const setFoodCategories = useCallback((food_categories: string[]) => {
    setFilters(f => ({ ...f, food_categories }));
  }, []);

  const setDietary = useCallback((dietary: string[]) => {
    setFilters(f => ({ ...f, dietary }));
  }, []);

  const setDistance = useCallback((distance: string) => {
    setFilters(f => ({ ...f, distance }));
  }, []);

  const setOpenNow = useCallback((openNow: string) => {
    setFilters(f => ({ ...f, openNow }));
  }, []);

  const setRating = useCallback((rating: string) => {
    setFilters(f => ({ ...f, rating }));
  }, []);

  const setSortBy = useCallback((sortBy: 'recent' | 'popular') => {
    setFilters(f => ({ ...f, sortBy }));
  }, []);

  const setPhotosOnly = useCallback((photosOnly: boolean) => {
    setFilters(f => ({ ...f, photosOnly }));
  }, []);

  const setCampusOnly = useCallback((campusOnly: boolean) => {
    setFilters(f => ({ ...f, campusOnly }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_MAP_FILTERS);
  }, []);

  const patchAdvancedFilters = useCallback((patch: Partial<MapAdvancedFiltersPatch>) => {
    setFilters(f => ({ ...f, ...patch }));
  }, []);

  const resetAdvancedFilters = useCallback(() => {
    setFilters(f => ({ ...f, ...EMPTY_ADVANCED_FILTERS }));
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setSearch,
      setPostKind,
      setFoodCategories,
      setDietary,
      setDistance,
      setOpenNow,
      setRating,
      setSortBy,
      setPhotosOnly,
      setCampusOnly,
      clearAll,
      patchAdvancedFilters,
      resetAdvancedFilters,
    }),
    [
      filters,
      setSearch,
      setPostKind,
      setFoodCategories,
      setDietary,
      setDistance,
      setOpenNow,
      setRating,
      setSortBy,
      setPhotosOnly,
      setCampusOnly,
      clearAll,
      patchAdvancedFilters,
      resetAdvancedFilters,
    ],
  );

  return (
    <NommiFilterContext.Provider value={value}>
      {children}
    </NommiFilterContext.Provider>
  );
}
