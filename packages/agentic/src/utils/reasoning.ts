import type { Movie, UserCriteria } from '../types';

/**
 * Generate fake reasoning for movie evaluation results
 */
export function generateFakeReasoning(movie: Movie, criteria: UserCriteria, score: number): string {
  const reasons = [];

  if (score >= 0.8) {
    reasons.push(`Excellent match for ${criteria.ageGroup.toLowerCase()} sci-fi preferences`);
  } else if (score >= 0.6) {
    reasons.push(`Good alignment with specified themes`);
  } else {
    reasons.push(`Partial match but may lack some preferred elements`);
  }

  if (movie.genre.some((g) => criteria.enhancedGenres.includes(g))) {
    reasons.push(`matches preferred genres: ${movie.genre.join(', ')}`);
  }

  if (criteria.familyFriendly && ['G', 'PG', 'PG-13'].includes(movie.familyRating)) {
    reasons.push(`family-appropriate rating (${movie.familyRating})`);
  }

  return reasons.join('; ');
}
