export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  question_count?: number;
  question_types?: QuestionType[];
}

export interface QuestionType {
  id: number;
  subject_id: number;
  name: string;
  sort_order: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}
