/**
 * Batch Generation API Service
 * Handles all batch scenario generation API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Types for batch generation
export interface ParameterRange {
  min: number;
  max: number;
  step?: number;
  count?: number;
}

export interface ParameterDistribution {
  type: 'uniform' | 'normal' | 'custom';
  parameters: Record<string, any>;
  count: number;
}

export interface VariationConfig {
  parameter_ranges?: Record<string, ParameterRange>;
  parameter_sets?: Record<string, any[]>;
  parameter_distributions?: Record<string, ParameterDistribution>;
  max_combinations?: number;
}

export interface BatchGenerationConfig {
  base_params: Record<string, any>;
  variation_config: VariationConfig;
  max_scenarios?: number;
  parallel?: boolean;
  max_workers?: number;
  enable_caching?: boolean;
  streaming?: boolean;
  chunk_size?: number;
}

export interface ScenarioResult {
  xosc_content: string;
  xodr_content: string;
  parameters: Record<string, any>;
  generation_success: boolean;
  error?: string;
}

export interface BatchGenerationResult {
  success: boolean;
  total_scenarios: number;
  scenarios: Array<Record<string, ScenarioResult>>;
  generation_time: number;
  config?: BatchGenerationConfig;
  error?: string;
}

export interface NCAPTestVariation {
  test_id: string;
  test_name: string;
  category: 'AEB' | 'LKA' | 'BSD' | 'ACC' | 'ESC';
  ego_speed: number;
  weather_condition: string;
  road_type: string;
  target_type?: string;
}

export interface NCAPGenerationResult {
  success: boolean;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  generation_time: number;
  variations: NCAPTestVariation[];
  test_type: string;
  error?: string;
}

export interface TemplateGenerationResult {
  success: boolean;
  template_name: string;
  total_scenarios: number;
  successful_scenarios: number;
  failed_scenarios: number;
  generation_time: number;
  scenarios: Array<Record<string, ScenarioResult>>;
  error?: string;
}

export interface BatchStatus {
  status: 'idle' | 'generating' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  current_scenario?: number;
  total_scenarios?: number;
  estimated_completion?: number;
  error_message?: string;
}

/**
 * Generate batch scenarios with parameter variations
 */
export const generateBatchScenarios = async (
  config: BatchGenerationConfig
): Promise<BatchGenerationResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/generate`, config, {
      timeout: 300000, // 5 minutes timeout for large batches
    });

    return response.data;
  } catch (error) {
    console.error('Error in batch generation API:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Batch generation timed out. Please try with fewer scenarios.');
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid configuration: ${error.response.data.detail || 'Bad request'}`);
      } else if (error.response?.status === 500) {
        throw new Error('Server error during batch generation. Please try again.');
      }
    }
    
    throw new Error('Failed to generate batch scenarios. Please try again.');
  }
};

/**
 * Generate parameter variations (without full scenario generation)
 */
export const generateParameterVariations = async (
  baseParams: Record<string, any>,
  variationConfig: VariationConfig
): Promise<{ success: boolean; variations: Record<string, any>[] }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/variations`, {
      base_params: baseParams,
      variation_config: variationConfig
    });

    return response.data;
  } catch (error) {
    console.error('Error in parameter variations API:', error);
    throw new Error('Failed to generate parameter variations. Please try again.');
  }
};

/**
 * Generate NCAP test variations
 */
export const generateNCAPTestVariations = async (
  baseParams: Record<string, any>,
  testType: 'AEB' | 'LSS' | 'SAS' | 'OD'
): Promise<NCAPGenerationResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/ncap`, {
      base_params: baseParams,
      test_type: testType
    });

    return response.data;
  } catch (error) {
    console.error('Error in NCAP generation API:', error);
    throw new Error('Failed to generate NCAP test variations. Please try again.');
  }
};

/**
 * Generate scenarios from template
 */
export const generateFromTemplate = async (
  template: Record<string, any>,
  templateVariables: Record<string, any[]>,
  maxCombinations?: number
): Promise<TemplateGenerationResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/template`, {
      template,
      template_variables: templateVariables,
      max_combinations: maxCombinations
    });

    return response.data;
  } catch (error) {
    console.error('Error in template generation API:', error);
    throw new Error('Failed to generate scenarios from template. Please try again.');
  }
};

/**
 * Get batch generation status
 */
export const getBatchStatus = async (sessionId: string): Promise<BatchStatus> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/batch/status/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting batch status:', error);
    return {
      status: 'failed',
      error_message: 'Failed to get batch status'
    };
  }
};

/**
 * Download batch results as archive
 */
export const downloadBatchResults = async (
  results: BatchGenerationResult,
  format: 'zip' | 'tar' = 'zip'
): Promise<Blob> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/download`, {
      results,
      format
    }, {
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error downloading batch results:', error);
    throw new Error('Failed to download batch results. Please try again.');
  }
};

/**
 * Cancel ongoing batch generation
 */
export const cancelBatchGeneration = async (sessionId: string): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/batch/cancel/${sessionId}`);
  } catch (error) {
    console.error('Error cancelling batch generation:', error);
    throw new Error('Failed to cancel batch generation.');
  }
};

/**
 * Get available scenario templates
 */
export const getAvailableTemplates = async (): Promise<{ templates: Array<{ id: string; name: string; description: string; variables: string[] }> }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/batch/templates`);
    return response.data;
  } catch (error) {
    console.error('Error getting templates:', error);
    return { templates: [] };
  }
};

/**
 * Validate template syntax
 */
export const validateTemplate = async (
  template: Record<string, any>
): Promise<{ valid: boolean; errors: string[]; variables: string[] }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/template/validate`, {
      template
    });
    return response.data;
  } catch (error) {
    console.error('Error validating template:', error);
    return {
      valid: false,
      errors: ['Failed to validate template'],
      variables: []
    };
  }
};

/**
 * Save custom template
 */
export const saveTemplate = async (
  name: string,
  template: Record<string, any>
): Promise<{ success: boolean; template_id?: string; error?: string }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/templates`, {
      name,
      template
    });
    return response.data;
  } catch (error) {
    console.error('Error saving template:', error);
    return {
      success: false,
      error: 'Failed to save template'
    };
  }
};