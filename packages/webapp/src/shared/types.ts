// Shared TypeScript interfaces for client-server communication

export interface UserRequirements {
  prompt: string;
  preferences?: {
    genres?: string[];
    maxResults?: number;
    includeAdult?: boolean;
  };
}

export interface Movie {
  id: string;
  title: string;
  year?: number;
  genre?: string[];
  rating?: number;
  overview?: string;
  posterUrl?: string;
  tmdbId?: number;
  source?: string;
  reasoning?: string;
  confidenceScore?: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  details?: string;
}

export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  details?: unknown;
}

export interface EnhancedUserCriteria {
  originalInput: string;
  enhancedGenres: string[];
  excludeGenres: string[];
  ageGroup: string;
  familyFriendly: boolean;
  preferredThemes: string[];
  avoidThemes: string[];
  searchTerms: string[];
}

// WebSocket message types
export type ServerMessage =
  | { type: 'workflow_started'; payload: { workflowId: string } }
  | { type: 'workflow_status'; payload: { status: WorkflowStatus } }
  | { type: 'node_activated'; payload: { nodeId: string; nodeName: string } }
  | { type: 'node_completed'; payload: { nodeId: string; nodeName: string } }
  | { type: 'node_error'; payload: { nodeId: string; error: string } }
  | { type: 'movie_found'; payload: { movie: Movie } }
  | { type: 'progress_update'; payload: { nodeId: string; progress: number } }
  | { type: 'log_event'; payload: LogEvent }
  | { type: 'enhancement_complete'; payload: { enhancement: EnhancedUserCriteria } }
  | { type: 'workflow_complete'; payload: { recommendations: Movie[] } }
  | { type: 'error'; payload: { message: string; details?: unknown } };

export type ClientMessage =
  | { type: 'start_workflow'; payload: UserRequirements }
  | { type: 'cancel_workflow' }
  | { type: 'ping' };

export interface WorkflowStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  nodes: WorkflowNode[];
  currentNode?: string;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  results?: Movie[];
}
