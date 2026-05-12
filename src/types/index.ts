export type PostType = 'free_food' | 'recommendation' | 'event';
export type ReactionType = 'like' | 'still_there';
export type IntentType = 'saved' | 'been_there' | 'want_to_go' | 'favorite';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  food_personality?: string;
  /** When true, signed-in users can browse this profile’s Nommi friends (see migration 009 + RPC). */
  show_friends_public?: boolean;
  created_at: string;
}

export interface CircleShareMeta {
  circle_id: string;
  circle_name: string;
  share_id: string;
  shared_at: string;
  shared_by_id: string;
  shared_by?: UserProfile;
  note?: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  author?: UserProfile;
  type: PostType;
  title: string;
  description: string;
  image_url?: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  /** Official site from Google Places (when picked from search). */
  place_website_url?: string;
  /** Link to the place on Google Maps from Places details. */
  google_maps_url?: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  is_free_food: boolean;
  expires_at?: string;
  circle_id?: string;
  /** When true, UI shows pseudonym author; `author_id` remains the real owner. */
  is_anonymous?: boolean;
  /** Present when post is shown in a circle feed (curated share, not authorship). */
  circle_share?: CircleShareMeta;
  created_at: string;
  updated_at: string;
  like_count?: number;
  still_there_count?: number;
  comment_count?: number;
  /** Reaction chips the viewer has on this post (like and still_there can both be present). */
  viewer_reactions?: ReactionType[];
  // Mock fields for rating / open-now filters
  mock_rating?: number;
  mock_is_open?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author?: UserProfile;
  content: string;
  created_at: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
}

export interface FoodCircle {
  id: string;
  name: string;
  description: string;
  icon_type: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  tags?: string[];
}

export interface CircleActivityItem {
  share_id: string;
  shared_at: string;
  circle: { id: string; name: string };
  sharer: UserProfile;
  post: Post;
  note?: string | null;
}

export interface CreateCircleInput {
  name: string;
  description: string;
  icon_type?: string;
  tags?: string[];
}

export interface CircleMembership {
  circle_id: string;
  user_id: string;
  joined_at: string;
}

export interface PostFilter {
  type?: 'all' | PostType;
  dietary?: string;
  cuisine?: string;
  searchQuery?: string;
  circleId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/** Compose-only: how location was picked (posts table unchanged). */
export type LocationPickSource = 'manual' | 'campus' | 'search';

export interface CreatePostData {
  type: PostType;
  title: string;
  description: string;
  image_url?: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  /** Client-only hint while drafting; omit from DB writes. */
  location_pick_source?: LocationPickSource;
  place_website_url?: string;
  google_maps_url?: string;
  cuisine_tags: string[];
  dietary_tags: string[];
  is_free_food: boolean;
  expires_at?: string;
  circle_id?: string;
  is_anonymous?: boolean;
}

export interface AppError {
  message: string;
  code?: string;
}

export interface PostIntent {
  id: string;
  user_id: string;
  post_id: string;
  intent_type: IntentType;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Friendship {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface DirectMessageThread {
  id: string;
  participant_ids: string[];
  last_message_at: string;
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body?: string;
  message_type?: 'text' | 'image';
  image_url?: string;
  created_at: string;
}
