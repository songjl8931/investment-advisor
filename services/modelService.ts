import { ModelConfig } from '../types';

const API_BASE_URL = '/api';

export const fetchModels = async (): Promise<ModelConfig[]> => {
  const response = await fetch(`${API_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
};

export const saveModels = async (models: ModelConfig[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(models.map(m => ({
      id: m.id,
      provider: m.provider,
      name: m.name,
      api_key: m.api_key,
      base_url: m.base_url,
      modules: m.modules
    }))),
  });

  if (!response.ok) {
    throw new Error('Failed to save models');
  }
};
