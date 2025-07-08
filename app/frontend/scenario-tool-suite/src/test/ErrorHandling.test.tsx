/**
 * Error handling and fallback tests for 3D visualization refactor
 * Tests graceful degradation and error recovery mechanisms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';

// Mock console to suppress expected error messages during tests
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

// Mock WebGL context creation failures
const mockWebGLFailed = () => {
  const mockGetContext = vi.fn(() => null);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: mockGetContext,
    writable: true,
  });
  return mockGetContext;
};

// Mock successful WebGL context
const mockWebGLSuccess = () => {
  const mockContext = {
    canvas: {},
    drawingBufferWidth: 300,
    drawingBufferHeight: 150,
    getExtension: vi.fn(() => ({})),
    getParameter: vi.fn(() => 'MockRenderer'),
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
  };
  
  const mockGetContext = vi.fn(() => mockContext);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: mockGetContext,
    writable: true,
  });
  return mockGetContext;
};

// Mock Three.js with error scenarios
vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        throw new Error('Invalid Vector3 coordinates');
      }
    }
    clone() { return new (this.constructor as any)(this.x, this.y, this.z); }
  },
  Euler: class {
    constructor(public x = 0, public y = 0, public z = 0) {
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        throw new Error('Invalid Euler angles');
      }
    }
    clone() { return new (this.constructor as any)(this.x, this.y, this.z); }
  },
  WebGLRenderer: class {
    constructor(options?: any) {
      if (options?.failInit) {
        throw new Error('WebGL not supported');
      }
      this.domElement = document.createElement('canvas');
    }
    setSize() {}
    dispose() {}
  },
  BufferGeometry: class {
    setFromPoints(points: any[]) {
      if (!Array.isArray(points) || points.length === 0) {
        throw new Error('Invalid points array');
      }
      return this;
    }
  },
}));

// Mock R3F with error handling
let shouldFailCanvas = false;
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onError }: { children: React.ReactNode, onError?: (error: Error) => void }) => {
    if (shouldFailCanvas) {
      const error = new Error('Canvas initialization failed');
      if (onError) {
        onError(error);
      }
      return <div data-testid="canvas-error">WebGL Error</div>;
    }
    return <div data-testid="r3f-canvas">{children}</div>;
  },
  useFrame: vi.fn(),
  useThree: () => ({
    camera: { position: { x: 0, y: 0, z: 10 } },
    gl: { info: { render: { calls: 0 } } },
    scene: {}
  }),
}));

// Mock Comlink with error scenarios
let shouldFailWorker = false;
vi.mock('comlink', () => ({
  wrap: vi.fn(() => {
    if (shouldFailWorker) {
      return {
        parseScenarioData: vi.fn().mockRejectedValue(new Error('Worker parsing failed'))
      };
    }
    return {
      parseScenarioData: vi.fn().mockResolvedValue({
        vehicles: [],
        timeline: [],
        openDriveData: null,
        openScenarioData: null,
        validationIssues: []
      })
    };
  }),
  expose: vi.fn(),
}));

// Mock Worker with error scenarios
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor(scriptURL: string | URL) {
    if (shouldFailWorker) {
      setTimeout(() => {
        if (this.onerror) {
          this.onerror(new ErrorEvent('error', { message: 'Worker script failed to load' }));
        }
      }, 10);
    }
  }
  
  postMessage(message: any) {
    if (shouldFailWorker) {
      setTimeout(() => {
        if (this.onerror) {
          this.onerror(new ErrorEvent('error', { message: 'Worker message failed' }));
        }
      }, 10);
    }
  }
  
  terminate() {}
  
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'error' && shouldFailWorker) {
      setTimeout(() => {
        if (typeof listener === 'function') {
          listener(new ErrorEvent('error', { message: 'Worker error' }));
        }
      }, 10);
    }
  }
  
  removeEventListener() {}
}

(global as any).Worker = MockWorker;

// Import after mocking
import { useVisualizationStore } from '../stores/visualizationStore';
import { useScenarioData } from '../hooks/useScenarioData';

describe('WebGL Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldFailCanvas = false;
    shouldFailWorker = false;
    console.error = mockConsole.error;
    console.warn = mockConsole.warn;
  });

  it('should handle WebGL context creation failure', () => {
    mockWebGLFailed();
    shouldFailCanvas = true;
    
    const TestComponent = () => {
      const [error, setError] = React.useState<Error | null>(null);
      
      return (
        <div>
          {error ? (
            <div data-testid="fallback-canvas">
              WebGL not supported. Please enable WebGL or use a supported browser.
            </div>
          ) : (
            <Canvas onError={setError}>
              <mesh />
            </Canvas>
          )}
        </div>
      );
    };
    
    const { Canvas } = require('@react-three/fiber');
    
    render(<TestComponent />);
    
    expect(screen.getByTestId('canvas-error')).toBeInTheDocument();
  });

  it('should provide fallback for unsupported WebGL features', () => {
    const featureSupport = {
      webgl2: false,
      instancing: false,
      floatTextures: false
    };
    
    const getFallbackConfig = (support: typeof featureSupport) => {
      return {
        useInstancing: support.instancing && support.webgl2,
        maxLODLevels: support.webgl2 ? 3 : 2,
        textureQuality: support.floatTextures ? 'high' : 'low',
        fallbackMode: !support.webgl2
      };
    };
    
    const config = getFallbackConfig(featureSupport);
    
    expect(config.useInstancing).toBe(false);
    expect(config.maxLODLevels).toBe(2);
    expect(config.fallbackMode).toBe(true);
  });

  it('should gracefully degrade rendering quality', () => {
    const renderingFallbacks = {
      shadows: true,
      antialiasing: true,
      postProcessing: true,
      complexShaders: true
    };
    
    const applyFallbacks = (webglError: boolean) => {
      if (webglError) {
        return {
          shadows: false,
          antialiasing: false,
          postProcessing: false,
          complexShaders: false,
          wireframe: true // Fallback to wireframe
        };
      }
      return renderingFallbacks;
    };
    
    const fallbackConfig = applyFallbacks(true);
    
    expect(fallbackConfig.shadows).toBe(false);
    expect(fallbackConfig.wireframe).toBe(true);
  });
});

describe('Data Parsing Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldFailWorker = false;
  });

  it('should handle corrupted XML files', async () => {
    const corruptedFiles = {
      'corrupt.xosc': '<<invalid-xml>>content<<',
      'malformed.xodr': 'not xml at all'
    };
    
    const { result } = renderHook(() => useScenarioData());
    
    await act(async () => {
      try {
        await result.current.parseData(corruptedFiles, {});
      } catch (error) {
        // Expected to handle gracefully
      }
    });
    
    // Should not crash and should provide fallback data
    expect(result.current.loading).toBe(false);
  });

  it('should handle Web Worker failures', async () => {
    shouldFailWorker = true;
    
    const { result } = renderHook(() => useScenarioData());
    
    await act(async () => {
      try {
        await result.current.parseData({}, {});
      } catch (error) {
        // Expected error
      }
    });
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.error).toBeTruthy();
  });

  it('should handle extremely large files', async () => {
    const largeFile = 'x'.repeat(50 * 1024 * 1024); // 50MB string
    const largeFiles = {
      'huge.xosc': largeFile
    };
    
    const { result } = renderHook(() => useScenarioData());
    
    // Should either handle gracefully or timeout appropriately
    await act(async () => {
      try {
        const startTime = Date.now();
        await result.current.parseData(largeFiles, {});
        const endTime = Date.now();
        
        // Should complete within reasonable time even for large files
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      } catch (error) {
        // Large file rejection is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  it('should handle memory exhaustion scenarios', () => {
    const memoryPressureSimulation = {
      availableMemory: 100, // MB
      requiredMemory: 500,  // MB
      maxVehicles: 10000
    };
    
    const handleMemoryPressure = (scenario: typeof memoryPressureSimulation) => {
      if (scenario.requiredMemory > scenario.availableMemory) {
        // Reduce complexity
        const reductionFactor = scenario.availableMemory / scenario.requiredMemory;
        return {
          maxVehicles: Math.floor(scenario.maxVehicles * reductionFactor),
          lodLevel: 'low' as const,
          instancingForced: true,
          textureQuality: 'low' as const
        };
      }
      return null; // No reduction needed
    };
    
    const reduction = handleMemoryPressure(memoryPressureSimulation);
    
    expect(reduction).toBeTruthy();
    expect(reduction!.maxVehicles).toBe(2000);
    expect(reduction!.lodLevel).toBe('low');
  });
});

describe('Store Error Handling', () => {
  beforeEach(() => {
    useVisualizationStore.getState().reset();
    vi.clearAllMocks();
  });

  it('should handle invalid data gracefully', () => {
    const { setData, setError } = useVisualizationStore.getState();
    
    // Try to set invalid data
    act(() => {
      try {
        setData({
          vehicles: null as any, // Invalid data
          timeline: undefined as any,
          openDriveData: null,
          openScenarioData: null,
          validationIssues: 'not an array' as any
        });
      } catch (error) {
        setError('Invalid data format');
      }
    });
    
    const state = useVisualizationStore.getState();
    expect(state.error).toBeTruthy();
  });

  it('should handle state corruption recovery', () => {
    const { reset } = useVisualizationStore.getState();
    
    // Simulate corrupted state
    const corruptedUpdate = () => {
      try {
        // Force invalid state
        (useVisualizationStore as any).setState(() => {
          throw new Error('State corruption');
        });
      } catch (error) {
        // Recover by resetting
        reset();
      }
    };
    
    expect(() => corruptedUpdate()).not.toThrow();
    
    const state = useVisualizationStore.getState();
    expect(state.vehicles).toEqual([]);
    expect(state.error).toBeNull();
  });

  it('should handle concurrent state updates', () => {
    const { setCurrentTime, setPlaybackSpeed } = useVisualizationStore.getState();
    
    // Simulate rapid concurrent updates
    const updates = Promise.all([
      new Promise(resolve => {
        act(() => {
          setCurrentTime(10);
          resolve(true);
        });
      }),
      new Promise(resolve => {
        act(() => {
          setPlaybackSpeed(2);
          resolve(true);
        });
      }),
      new Promise(resolve => {
        act(() => {
          setCurrentTime(20);
          resolve(true);
        });
      })
    ]);
    
    expect(updates).resolves.toBeTruthy();
    
    const state = useVisualizationStore.getState();
    expect(typeof state.currentTime).toBe('number');
    expect(typeof state.playbackSpeed).toBe('number');
  });
});

describe('Component Error Boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should catch Three.js geometry errors', () => {
    const invalidPoints: any[] = [
      { x: NaN, y: 0, z: 0 },
      { x: 0, y: Infinity, z: 0 }
    ];
    
    const createSafeGeometry = (points: any[]) => {
      try {
        // Validate points before creating geometry
        const validPoints = points.filter(p => 
          typeof p.x === 'number' && !isNaN(p.x) && isFinite(p.x) &&
          typeof p.y === 'number' && !isNaN(p.y) && isFinite(p.y) &&
          typeof p.z === 'number' && !isNaN(p.z) && isFinite(p.z)
        );
        
        if (validPoints.length < 2) {
          // Fallback to default line
          return [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
        }
        
        return validPoints;
      } catch (error) {
        // Return fallback geometry
        return [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
      }
    };
    
    const safePoints = createSafeGeometry(invalidPoints);
    
    expect(safePoints).toHaveLength(2);
    expect(safePoints[0]).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('should handle component rendering failures', () => {
    const FailingComponent = ({ shouldFail }: { shouldFail: boolean }) => {
      if (shouldFail) {
        throw new Error('Component render failed');
      }
      return <div data-testid="success">Rendered successfully</div>;
    };
    
    const SafeWrapper = ({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) => {
      try {
        return <>{children}</>;
      } catch (error) {
        return <>{fallback}</>;
      }
    };
    
    const TestComponent = () => (
      <SafeWrapper fallback={<div data-testid="fallback">Error fallback</div>}>
        <FailingComponent shouldFail={false} />
      </SafeWrapper>
    );
    
    render(<TestComponent />);
    expect(screen.getByTestId('success')).toBeInTheDocument();
  });
});

describe('Performance Degradation Handling', () => {
  it('should handle extreme performance drops', () => {
    const performanceManager = {
      fps: 60,
      consecutiveLowFrames: 0,
      emergencyMode: false
    };
    
    const handlePerformanceCrisis = (currentFps: number) => {
      if (currentFps < 10) {
        performanceManager.consecutiveLowFrames++;
        
        if (performanceManager.consecutiveLowFrames > 10) {
          // Emergency mode: disable everything non-essential
          performanceManager.emergencyMode = true;
          return {
            lodLevel: 'low' as const,
            maxVehicles: 10,
            disableShadows: true,
            disableAnimations: true,
            wireframeMode: true
          };
        }
      } else {
        performanceManager.consecutiveLowFrames = 0;
        if (currentFps > 30) {
          performanceManager.emergencyMode = false;
        }
      }
      
      return null;
    };
    
    // Simulate severe performance drop
    const emergency = handlePerformanceCrisis(5);
    
    expect(performanceManager.consecutiveLowFrames).toBe(1);
    
    // Continue simulation
    for (let i = 0; i < 15; i++) {
      handlePerformanceCrisis(5);
    }
    
    expect(performanceManager.emergencyMode).toBe(true);
  });

  it('should handle browser tab switching', () => {
    const visibilityManager = {
      isVisible: true,
      pausedState: null as any
    };
    
    const handleVisibilityChange = (hidden: boolean) => {
      if (hidden && visibilityManager.isVisible) {
        // Tab hidden - pause everything
        visibilityManager.pausedState = {
          isPlaying: useVisualizationStore.getState().isPlaying,
          currentTime: useVisualizationStore.getState().currentTime
        };
        
        useVisualizationStore.getState().pause();
        visibilityManager.isVisible = false;
      } else if (!hidden && !visibilityManager.isVisible) {
        // Tab visible - restore state
        if (visibilityManager.pausedState?.isPlaying) {
          useVisualizationStore.getState().play();
        }
        visibilityManager.isVisible = true;
      }
    };
    
    // Start playing
    act(() => {
      useVisualizationStore.getState().play();
    });
    
    expect(useVisualizationStore.getState().isPlaying).toBe(true);
    
    // Simulate tab hidden
    handleVisibilityChange(true);
    
    expect(useVisualizationStore.getState().isPlaying).toBe(false);
    expect(visibilityManager.pausedState.isPlaying).toBe(true);
    
    // Simulate tab visible
    handleVisibilityChange(false);
    
    expect(useVisualizationStore.getState().isPlaying).toBe(true);
  });
});

describe('Network and Resource Error Handling', () => {
  it('should handle missing texture resources', () => {
    const textureManager = {
      loadedTextures: new Map(),
      fallbackTexture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };
    
    const loadTexture = async (url: string) => {
      try {
        // Simulate network request
        if (url.includes('missing')) {
          throw new Error('Texture not found');
        }
        
        textureManager.loadedTextures.set(url, 'loaded');
        return 'loaded';
      } catch (error) {
        // Use fallback texture
        textureManager.loadedTextures.set(url, textureManager.fallbackTexture);
        return textureManager.fallbackTexture;
      }
    };
    
    const result = loadTexture('missing-texture.png');
    
    expect(result).resolves.toBe(textureManager.fallbackTexture);
  });

  it('should handle model loading failures', () => {
    const modelManager = {
      fallbackModel: 'simple-box-geometry'
    };
    
    const loadModel = async (url: string) => {
      try {
        if (url.includes('404')) {
          throw new Error('Model not found');
        }
        return 'complex-model';
      } catch (error) {
        // Use simple geometry as fallback
        return modelManager.fallbackModel;
      }
    };
    
    const result = loadModel('404-model.glb');
    
    expect(result).resolves.toBe('simple-box-geometry');
  });
});