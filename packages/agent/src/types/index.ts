// ===== TYPE DEFINITIONS =====

export interface UserCriteria {
  originalInput: string;
  enhancedGenres: string[];
  excludeGenres: string[];
  ageGroup: string;
  familyFriendly: boolean;
  preferredThemes: string[];
  avoidThemes: string[];
  searchTerms: string[];
}

export interface Movie {
  title: string;
  year: number;
  genre: string[];
  rating: number;
  director: string;
  description: string;
  familyRating: string;
  themes: string[];
}

export interface MovieEvaluation {
  movie: Movie;
  confidenceScore: number;
  matchReasoning: string;
  familyAppropriate: boolean;
}