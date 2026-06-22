/**
 * Data API service
 * Handles composition and composer data
 */
import api from './config';

export interface Composer {
  name: string;
  composition_count: number;
}

export interface ComposersSummary {
  labeled: Composer[];
  unlabeled: Composer[];
  total_compositions: number;
  labeled_count: number;
  unlabeled_count: number;
  collection_target: number;
}

export interface Composition {
  name: string;
  emotions: string[];
  emotion_count: number;
  youtube_url?: string;
}

/**
 * Get summary of all composers
 */
export const getComposersSummary = async (): Promise<ComposersSummary> => {
  const response = await api.get<ComposersSummary>('/api/data/composers/summary');
  return response.data;
};

/**
 * Get compositions for a specific composer
 */
export const getComposerCompositions = async (composerName: string): Promise<Composition[]> => {
  const response = await api.get<Composition[]>(`/api/data/composers/${encodeURIComponent(composerName)}/compositions`);
  return response.data;
};

/**
 * Get unlabeled compositions for a specific composer
 */
export const getComposerUnlabeledCompositions = async (composerName: string): Promise<Composition[]> => {
  const response = await api.get<Composition[]>(`/api/data/composers/${encodeURIComponent(composerName)}/unlabeled-compositions`);
  return response.data;
};

/**
 * Get all unique emotions
 */
export const getAllEmotions = async (): Promise<string[]> => {
  const response = await api.get<{ emotions: string[]; count: number }>('/api/data/emotions');
  return response.data.emotions;
};

/**
 * Add a new composer (stored in separate JSON file)
 */
export const addComposer = async (composerName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/api/data/composers/add', {
    composer_name: composerName,
  });
  return response.data;
};

/**
 * Add a new composition to a composer (stored in separate JSON file)
 */
export const addComposition = async (
  composerName: string,
  compositionName: string,
  youtubeUrl?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/api/data/compositions/add', {
    composer_name: composerName,
    composition_name: compositionName,
    youtube_url: youtubeUrl || null,
  });
  return response.data;
};

/**
 * Submit emotion labels for a composition
 */
export const submitLabels = async (
  composerName: string,
  compositionName: string,
  emotions: string[],
  isLabeled: boolean
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/api/data/compositions/submit-labels', {
    composer_name: composerName,
    composition_name: compositionName,
    emotions: emotions,
    is_labeled: isLabeled,
  });
  return response.data;
};
