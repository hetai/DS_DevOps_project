/**
 * Performance Monitor - GPU acceleration and performance optimization utilities
 * Inspired by Dash's performance optimization techniques
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  gpuMemory: number;
  drawCalls: number;
  triangleCount: number;
  geometryCount: number;
  textureCount: number;
  programCount: number;
  renderTargetCount: number;
}

export interface PerformanceThresholds {
  minFps: number;
  maxFrameTime: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
  maxTriangles: number;
}

export class PerformanceMonitor {
  private renderer: THREE.WebGLRenderer;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private onPerformanceWarning?: (warning: string, metrics: PerformanceMetrics) => void;
  
  private readonly HISTORY_SIZE = 60; // Keep 60 frames of history
  
  constructor(
    renderer: THREE.WebGLRenderer,
    thresholds: Partial<PerformanceThresholds> = {},
    onPerformanceWarning?: (warning: string, metrics: PerformanceMetrics) => void
  ) {
    this.renderer = renderer;
    this.onPerformanceWarning = onPerformanceWarning;
    
    // Default performance thresholds
    this.thresholds = {
      minFps: 30,
      maxFrameTime: 33.33, // 30 FPS = 33.33ms per frame
      maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
      maxDrawCalls: 1000,
      maxTriangles: 500000,
      ...thresholds
    };
    
    this.metrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      gpuMemory: 0,
      drawCalls: 0,
      triangleCount: 0,
      geometryCount: 0,
      textureCount: 0,
      programCount: 0,
      renderTargetCount: 0
    };
  }
  
  /**
   * Update performance metrics (call once per frame)
   */
  public update(): PerformanceMetrics {
    this.frameCount++;
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    // Update frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate FPS
    const fps = 1000 / frameTime;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.HISTORY_SIZE) {
      this.fpsHistory.shift();
    }
    
    // Update metrics
    this.metrics = {
      fps: this.getAverageFPS(),
      frameTime: this.getAverageFrameTime(),
      memoryUsage: this.getMemoryUsage(),
      gpuMemory: this.getGPUMemoryUsage(),
      drawCalls: this.renderer.info.render.calls,
      triangleCount: this.renderer.info.render.triangles,
      geometryCount: this.renderer.info.memory.geometries,
      textureCount: this.renderer.info.memory.textures,
      programCount: this.renderer.info.programs?.length || 0,
      renderTargetCount: this.getActiveRenderTargets()
    };
    
    // Check for performance issues
    this.checkPerformanceThresholds();
    
    this.lastTime = currentTime;
    return this.metrics;
  }
  
  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get average FPS over recent frames
   */
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }
  
  /**
   * Get average frame time over recent frames
   */
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }
  
  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  /**
   * Get GPU memory usage estimate
   */
  private getGPUMemoryUsage(): number {
    // Estimate GPU memory usage based on textures and geometries
    const info = this.renderer.info;
    let estimatedMemory = 0;
    
    // Rough estimation: each texture averages 2MB, each geometry 100KB
    estimatedMemory += info.memory.textures * 2 * 1024 * 1024;
    estimatedMemory += info.memory.geometries * 100 * 1024;
    
    return estimatedMemory;
  }
  
  /**
   * Get number of active render targets
   */
  private getActiveRenderTargets(): number {
    // This is a simplified count - in a real implementation,
    // you'd track render targets more precisely
    return 0;
  }
  
  /**
   * Check if performance metrics exceed thresholds
   */
  private checkPerformanceThresholds(): void {
    if (!this.onPerformanceWarning) return;
    
    if (this.metrics.fps < this.thresholds.minFps) {
      this.onPerformanceWarning(
        `Low FPS detected: ${this.metrics.fps} (minimum: ${this.thresholds.minFps})`,
        this.metrics
      );
    }
    
    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      this.onPerformanceWarning(
        `High frame time: ${this.metrics.frameTime.toFixed(2)}ms (maximum: ${this.thresholds.maxFrameTime}ms)`,
        this.metrics
      );
    }
    
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.onPerformanceWarning(
        `High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB (maximum: ${(this.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB)`,
        this.metrics
      );
    }
    
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      this.onPerformanceWarning(
        `High draw calls: ${this.metrics.drawCalls} (maximum: ${this.thresholds.maxDrawCalls})`,
        this.metrics
      );
    }
    
    if (this.metrics.triangleCount > this.thresholds.maxTriangles) {
      this.onPerformanceWarning(
        `High triangle count: ${this.metrics.triangleCount} (maximum: ${this.thresholds.maxTriangles})`,
        this.metrics
      );
    }
  }
  
  /**
   * Get performance recommendations based on current metrics
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.fps < 30) {
      recommendations.push('Consider reducing visual quality or geometry complexity');
    }
    
    if (this.metrics.drawCalls > 500) {
      recommendations.push('Consider using geometry instancing to reduce draw calls');
    }
    
    if (this.metrics.triangleCount > 100000) {
      recommendations.push('Consider implementing Level-of-Detail (LOD) for distant objects');
    }
    
    if (this.metrics.textureCount > 50) {
      recommendations.push('Consider using texture atlases to reduce texture count');
    }
    
    if (this.metrics.memoryUsage > 256 * 1024 * 1024) { // 256MB
      recommendations.push('Consider implementing geometry and texture disposal');
    }
    
    return recommendations;
  }
  
  /**
   * Generate performance report
   */
  public generateReport(): string {
    const report = [
      '=== Performance Report ===',
      `FPS: ${this.metrics.fps}`,
      `Frame Time: ${this.metrics.frameTime.toFixed(2)}ms`,
      `Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `GPU Memory (est.): ${(this.metrics.gpuMemory / 1024 / 1024).toFixed(2)}MB`,
      `Draw Calls: ${this.metrics.drawCalls}`,
      `Triangles: ${this.metrics.triangleCount}`,
      `Geometries: ${this.metrics.geometryCount}`,
      `Textures: ${this.metrics.textureCount}`,
      `Shader Programs: ${this.metrics.programCount}`,
      '',
      '=== Recommendations ===',
      ...this.getPerformanceRecommendations()
    ];
    
    return report.join('\n');
  }
  
  /**
   * Reset performance tracking
   */
  public reset(): void {
    this.frameCount = 0;
    this.frameTimeHistory = [];
    this.fpsHistory = [];
    this.lastTime = performance.now();
    this.metrics = this.initializeMetrics();
  }
  
  /**
   * Enable GPU acceleration optimizations
   */
  public static enableGPUAcceleration(renderer: THREE.WebGLRenderer): void {
    const gl = renderer.getContext();
    
    // Enable extensions for better performance
    const extensions = [
      'OES_vertex_array_object',
      'WEBGL_draw_buffers',
      'EXT_texture_filter_anisotropic',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_depth_texture'
    ];
    
    extensions.forEach(ext => {
      const extension = gl.getExtension(ext);
      if (extension) {
        console.log(`Enabled GPU extension: ${ext}`);
      }
    });
    
    // Set up optimal renderer settings
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    
    // Enable shadow optimizations
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false; // Manual shadow updates for better performance
    }
  }
  
  /**
   * Optimize scene for performance
   */
  public static optimizeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Enable frustum culling
        object.frustumCulled = true;
        
        // Optimize materials
        if (object.material instanceof THREE.Material) {
          // Disable unnecessary material features for performance
          if (!object.material.transparent) {
            object.material.alphaTest = 0;
          }
        }
        
        // Optimize geometry
        if (object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.computeBoundingSphere();
          object.geometry.computeBoundingBox();
        }
      }
    });
    
    // Enable scene-level optimizations
    scene.autoUpdate = false; // Manual matrix updates
  }
  
  /**
   * Create GPU-accelerated compute shader (if supported)
   */
  public static createComputeShader(
    renderer: THREE.WebGLRenderer,
    computeShaderCode: string,
    uniforms: { [key: string]: THREE.IUniform }
  ): THREE.ShaderMaterial | null {
    const gl = renderer.getContext();
    
    // Check for compute shader support (WebGL 2.0)
    if (!gl.getParameter(gl.VERSION).includes('WebGL 2.0')) {
      console.warn('Compute shaders require WebGL 2.0');
      return null;
    }
    
    // Create compute shader material
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 position;
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: computeShaderCode,
      transparent: true
    });
    
    return material;
  }
}

/**
 * LOD (Level of Detail) Manager for performance optimization
 */
export class LODManager {
  private lodObjects: Map<string, THREE.LOD> = new Map();
  private camera: THREE.Camera | null = null;
  
  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  public createLOD(
    id: string,
    geometries: THREE.BufferGeometry[],
    material: THREE.Material,
    distances: number[]
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    geometries.forEach((geometry, index) => {
      const mesh = new THREE.Mesh(geometry, material);
      lod.addLevel(mesh, distances[index] || index * 50);
    });
    
    this.lodObjects.set(id, lod);
    return lod;
  }
  
  public updateLOD(): void {
    if (!this.camera) return;
    
    this.lodObjects.forEach((lod) => {
      lod.update(this.camera);
    });
  }
  
  public removeLOD(id: string): void {
    const lod = this.lodObjects.get(id);
    if (lod) {
      lod.levels.forEach(level => {
        if (level.object instanceof THREE.Mesh) {
          level.object.geometry.dispose();
          if (level.object.material instanceof THREE.Material) {
            level.object.material.dispose();
          }
        }
      });
      this.lodObjects.delete(id);
    }
  }
}

/**
 * Geometry batching for performance optimization
 */
export class GeometryBatcher {
  public static batchGeometries(
    geometries: THREE.BufferGeometry[],
    materials: THREE.Material[]
  ): { geometry: THREE.BufferGeometry; material: THREE.Material } | null {
    if (geometries.length === 0) return null;
    
    // Use BufferGeometryUtils for efficient merging
    const mergedGeometry = new THREE.BufferGeometry();
    
    // Simple merging approach - in production, use THREE.BufferGeometryUtils.mergeBufferGeometries
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    let vertexOffset = 0;
    
    geometries.forEach((geometry) => {
      const positionAttr = geometry.getAttribute('position');
      const normalAttr = geometry.getAttribute('normal');
      const uvAttr = geometry.getAttribute('uv');
      const indexAttr = geometry.getIndex();
      
      if (positionAttr) {
        positions.push(...positionAttr.array);
      }
      
      if (normalAttr) {
        normals.push(...normalAttr.array);
      }
      
      if (uvAttr) {
        uvs.push(...uvAttr.array);
      }
      
      if (indexAttr) {
        const indexArray = Array.from(indexAttr.array);
        indices.push(...indexArray.map(i => i + vertexOffset));
        vertexOffset += positionAttr.count;
      }
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length > 0) {
      mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    if (uvs.length > 0) {
      mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    if (indices.length > 0) {
      mergedGeometry.setIndex(indices);
    }
    
    return {
      geometry: mergedGeometry,
      material: materials[0] // Use first material
    };
  }
}