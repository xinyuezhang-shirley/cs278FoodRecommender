import { useContext, useMemo } from 'react';
import type { Post } from '../types';
import { NommiFilterContext, type NommiFilterContextValue } from '../context/nommiFiltersContext';
import { filterAndSortPosts } from '../utils/filterPostsWithMapFilters';

export type { MapFilters, MapAdvancedFiltersPatch } from '../types/mapFilters';

export function useNommiFilters(): NommiFilterContextValue {
  const ctx = useContext(NommiFilterContext);
  if (!ctx) throw new Error('useNommiFilters must be used within NommiFilterProvider');
  return ctx;
}

export function useNommiFilteredPosts(
  allPosts: Post[],
  userLocation: [number, number] | null,
): Post[] {
  const { filters } = useNommiFilters();
  return useMemo(
    () => filterAndSortPosts(allPosts, filters, userLocation),
    [allPosts, filters, userLocation],
  );
}
