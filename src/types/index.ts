export type PostType = 'free_food' | 'recommendation' | 'event';
export type ReactionType = 'like' | 'still_there';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  food_personality?: string;
  created_at: string;
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
  cuisine_tags: string[];
  dietary_tags: string[];
  is_free_food: boolean;
  expires_at?: string;
  circle_id?: string;
  created_at: string;
  updated_at: string;
  like_count?: number;
  still_there_count?: number;
  comment_count?: number;
  user_reaction?: ReactionType | null;
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

export interface CreatePostData {
  type: PostType;
  title: string;
  description: string;
  image_url?: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  cuisine_tags: string[];
  dietary_tags: string[];
  is_free_food: boolean;
  expires_at?: string;
  circle_id?: string;
}

export interface AppError {
  message: string;
  code?: string;
}
