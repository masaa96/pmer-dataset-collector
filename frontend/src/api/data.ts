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
  labeled?: boolean;
  sheet_pdf_id?: string | null;
  sheet_pdf_filename?: string | null;
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
 * Get every composition for a composer, regardless of labeled status
 */
export const getAllComposerCompositions = async (composerName: string): Promise<Composition[]> => {
  const response = await api.get<Composition[]>(`/api/data/composers/${encodeURIComponent(composerName)}/all-compositions`);
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
 * Get the names of all composers registered in the system (labeled and unlabeled)
 */
export const getAllComposerNames = async (): Promise<string[]> => {
  const response = await api.get<string[]>('/api/data/composers/names');
  return response.data;
};

/**
 * Surface an already-registered composer (e.g. one whose compositions are
 * all labeled) on the Unlabeled Composers page with a 0 count
 */
export const addComposerToUnlabeled = async (composerName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post<{ success: boolean; message: string }>('/api/data/composers/add-to-unlabeled', {
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

/**
 * Add a YouTube link to a composition that doesn't have one yet (admin only)
 */
export const addYoutubeLink = async (
  composerName: string,
  compositionName: string,
  youtubeUrl: string
): Promise<{ success: boolean; message: string; youtube_url: string }> => {
  const response = await api.post<{ success: boolean; message: string; youtube_url: string }>(
    '/api/data/compositions/add-youtube-link',
    {
      composer_name: composerName,
      composition_name: compositionName,
      youtube_url: youtubeUrl,
    }
  );
  return response.data;
};

/**
 * Upload a sheet music PDF for a composition that doesn't have one yet.
 * Maximum file size is 16 MB (MongoDB's single-document BSON size limit;
 * files are stored via GridFS on the backend).
 */
export const uploadSheetPdf = async (
  composerName: string,
  compositionName: string,
  file: File
): Promise<{ success: boolean; message: string; sheet_pdf_id: string; sheet_pdf_filename: string }> => {
  const formData = new FormData();
  formData.append('composer_name', composerName);
  formData.append('composition_name', compositionName);
  formData.append('file', file);

  const response = await api.post<{ success: boolean; message: string; sheet_pdf_id: string; sheet_pdf_filename: string }>(
    '/api/data/compositions/upload-sheet-pdf',
    formData,
    {
      // Override the instance's default JSON Content-Type so the browser
      // sets the correct multipart/form-data header (with boundary) itself.
      headers: { 'Content-Type': undefined as unknown as string },
    }
  );
  return response.data;
};
