import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  level: 'ERROR' | 'WARNING' | 'INFO';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export const validateOpenScenario = async (file: File): Promise<ValidationResult> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Transform backend response to match our frontend format
    const backendData = response.data;
    
    const result: ValidationResult = {
      valid: backendData.valid,
      errors: [],
      warnings: []
    };

    // Process errors and warnings from backend
    if (backendData.messages) {
      backendData.messages.forEach((msg: any) => {
        const error: ValidationError = {
          message: msg.text,
          line: msg.line,
          column: msg.column,
          level: msg.level
        };

        if (msg.level === 'ERROR') {
          result.errors.push(error);
        } else if (msg.level === 'WARNING') {
          result.warnings.push(error);
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error validating OpenSCENARIO file:', error);
    throw new Error('Failed to validate OpenSCENARIO file. Please try again.');
  }
};
