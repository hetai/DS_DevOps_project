import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ScenarioParameters {
  scenario_name: string;
  description: string;
  road_network: {
    opendrive_file?: string;
    road_description: string;
    generate_simple_road: boolean;
  };
  vehicles: Array<{
    name: string;
    category: string;
    bounding_box: {
      width: number;
      length: number;
      height: number;
    };
    performance: {
      max_speed: number;
      max_acceleration: number;
      max_deceleration: number;
    };
    initial_speed: number;
    initial_position?: {
      road_id: string;
      lane_id: number;
      s: number;
      offset: number;
    };
  }>;
  events: Array<{
    name: string;
    actions: Array<{
      type: 'speed' | 'lane_change' | 'teleport';
      speed_action?: {
        target_speed: number;
        transition_dynamics: string;
        duration?: number;
      };
      lane_change_action?: {
        target_lane_offset: number;
        transition_dynamics: string;
        duration?: number;
      };
      delay: number;
    }>;
    start_conditions: Array<{
      type: 'simulation_time' | 'traveled_distance' | 'relative_speed';
      value: number;
      rule: 'greaterThan' | 'lessThan' | 'equalTo';
    }>;
    priority: 'overwrite' | 'skip' | 'parallel';
  }>;
  environment: {
    weather: 'dry' | 'wet' | 'foggy' | 'snowy';
    time_of_day: 'day' | 'night' | 'dawn' | 'dusk';
    precipitation: number;
    visibility: number;
    wind_speed: number;
  };
  openscenario_version: string;
  ncap_compliance: boolean;
  parameter_variations: Record<string, any>;
}

export interface ChatResponse {
  message: string;
  parameters_extracted?: ScenarioParameters;
  is_complete: boolean;
  suggestions: string[];
}

export interface ChatRequest {
  message: string;
  conversation_history: ChatMessage[];
  session_id?: string;
}

export interface GenerationResponse {
  success: boolean;
  scenario_files: Record<string, string>;
  validation_results?: any;
  variations: Array<Record<string, string>>;
  error_message?: string;
}

export const chatWithAI = async (
  message: string,
  conversationHistory: ChatMessage[],
  sessionId?: string
): Promise<ChatResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat`, {
      message,
      conversation_history: conversationHistory,
      session_id: sessionId
    });

    return response.data;
  } catch (error) {
    console.error('Error in chat API:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
};

export const generateScenario = async (
  parameters: ScenarioParameters,
  generateVariations: boolean = false,
  outputFormat: string = '1.2'
): Promise<GenerationResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/generate`, {
      parameters,
      generate_variations: generateVariations,
      output_format: outputFormat
    });

    return response.data;
  } catch (error) {
    console.error('Error in generation API:', error);
    throw new Error('Failed to generate scenario. Please try again.');
  }
};

export const getApiStatus = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/status`);
    return response.data;
  } catch (error) {
    console.error('Error getting API status:', error);
    return {
      api_status: 'error',
      rag_initialized: false,
      services: {}
    };
  }
};

export const searchScenarios = async (query: string, limit: number = 5) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/scenarios/search`, {
      params: { query, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching scenarios:', error);
    return { scenarios: [], message: 'Search failed' };
  }
};