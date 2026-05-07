import type { UserPostCollections } from '../services/interactionService';

const PATH_SEGMENT: Record<keyof UserPostCollections, string> = {
  saved: 'saved',
  liked: 'liked',
  been_there: 'been-there',
  want_to_go: 'want-to-go',
  favorite: 'favorite',
};

/** URL segment (`/app/collections/:tabKey`) → collection key */
export function collectionsTabFromParam(param: string | undefined): keyof UserPostCollections {
  if (!param) return 'saved';
  const entry = (Object.entries(PATH_SEGMENT) as [keyof UserPostCollections, string][]).find(
    ([, seg]) => seg === param.toLowerCase(),
  );
  return entry?.[0] ?? 'saved';
}

export function pathForCollectionsTab(tab: keyof UserPostCollections): string {
  return `/app/collections/${PATH_SEGMENT[tab]}`;
}
