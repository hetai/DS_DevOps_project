/**
 * MeshLine utilities for enhanced trajectory rendering
 * Provides smooth, high-quality line rendering for vehicle trajectories
 */

import * as THREE from 'three';

// MeshLine implementation for React Three Fiber
export class MeshLine extends THREE.BufferGeometry {
  public isMeshLine = true;
  public type = 'MeshLine';
  
  private points: THREE.Vector3[] = [];
  private widthCallback?: (p: number) => number;
  
  constructor() {
    super();
  }
  
  setPoints(points: THREE.Vector3[] | Float32Array | number[], widthCallback?: (p: number) => number) {
    this.widthCallback = widthCallback;
    
    if (points instanceof Float32Array || Array.isArray(points)) {
      if (points instanceof Float32Array) {
        // Convert Float32Array to Vector3 array
        this.points = [];
        for (let i = 0; i < points.length; i += 3) {
          this.points.push(new THREE.Vector3(points[i], points[i + 1], points[i + 2]));
        }
      } else if (typeof points[0] === 'number') {
        // Convert number array to Vector3 array
        this.points = [];
        const numArray = points as number[];
        for (let i = 0; i < numArray.length; i += 3) {
          this.points.push(new THREE.Vector3(numArray[i], numArray[i + 1], numArray[i + 2]));
        }
      } else {
        // Already Vector3 array
        this.points = points as THREE.Vector3[];
      }
    }
    
    this.process();
    return this;
  }
  
  private process() {
    if (this.points.length < 2) return;
    
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    let index = 0;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const current = this.points[i];
      const next = this.points[i + 1];
      
      // Calculate direction
      const direction = new THREE.Vector3().subVectors(next, current).normalize();
      
      // Calculate perpendicular vector (assuming Y-up)
      const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
      
      // Calculate width at this point
      const t = i / (this.points.length - 1);
      const width = this.widthCallback ? this.widthCallback(t) : 0.1;
      const halfWidth = width * 0.5;
      
      // Create quad vertices
      const p1 = current.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
      const p2 = current.clone().sub(perpendicular.clone().multiplyScalar(halfWidth));
      const p3 = next.clone().add(perpendicular.clone().multiplyScalar(halfWidth));
      const p4 = next.clone().sub(perpendicular.clone().multiplyScalar(halfWidth));
      
      // Add vertices
      vertices.push(p1.x, p1.y, p1.z);
      vertices.push(p2.x, p2.y, p2.z);
      vertices.push(p3.x, p3.y, p3.z);
      vertices.push(p4.x, p4.y, p4.z);
      
      // Add normals (pointing up)
      for (let j = 0; j < 4; j++) {
        normals.push(0, 0, 1);
      }
      
      // Add UVs
      const u = i / (this.points.length - 1);
      uvs.push(u, 0);
      uvs.push(u, 1);
      uvs.push(u + 1 / (this.points.length - 1), 0);
      uvs.push(u + 1 / (this.points.length - 1), 1);
      
      // Add indices for two triangles
      indices.push(
        index, index + 1, index + 2,
        index + 1, index + 3, index + 2
      );
      
      index += 4;
    }
    
    this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.setIndex(indices);
    
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }
}

export class MeshLineMaterial extends THREE.ShaderMaterial {
  constructor(parameters: {
    color?: THREE.ColorRepresentation;
    opacity?: number;
    transparent?: boolean;
    lineWidth?: number;
    dashArray?: number;
    dashOffset?: number;
    dashRatio?: number;
    resolution?: THREE.Vector2;
    sizeAttenuation?: boolean;
  } = {}) {
    const {
      color = 0xffffff,
      opacity = 1,
      transparent = false,
      lineWidth = 1,
      dashArray = 0,
      dashOffset = 0,
      dashRatio = 0.5,
      resolution = new THREE.Vector2(1024, 1024),
      sizeAttenuation = true
    } = parameters;
    
    super({
      uniforms: {
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        lineWidth: { value: lineWidth },
        dashArray: { value: dashArray },
        dashOffset: { value: dashOffset },
        dashRatio: { value: dashRatio },
        resolution: { value: resolution },
        sizeAttenuation: { value: sizeAttenuation ? 1 : 0 }
      },
      
      vertexShader: `
        attribute vec2 uv;
        uniform float lineWidth;
        uniform vec2 resolution;
        uniform float sizeAttenuation;
        
        varying vec2 vUv;
        varying float vLineWidth;
        
        void main() {
          vUv = uv;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          if (sizeAttenuation == 1.0) {
            vLineWidth = lineWidth;
          } else {
            vLineWidth = lineWidth * resolution.y / 2.0;
          }
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float dashArray;
        uniform float dashOffset;
        uniform float dashRatio;
        
        varying vec2 vUv;
        varying float vLineWidth;
        
        void main() {
          float alpha = 1.0;
          
          if (dashArray > 0.0) {
            float dashPosition = mod(vUv.x + dashOffset, dashArray);
            if (dashPosition > dashArray * dashRatio) {
              discard;
            }
          }
          
          gl_FragColor = vec4(color, alpha * opacity);
        }
      `,
      
      transparent,
      depthTest: true,
      depthWrite: true
    });
  }
}

// Utility functions for MeshLine integration
export class MeshLineUtils {
  /**
   * Create enhanced trajectory geometry using MeshLine
   */
  static createTrajectoryMeshLine(
    points: THREE.Vector3[],
    width: number = 0.1,
    widthCallback?: (p: number) => number
  ): MeshLine {
    const meshLine = new MeshLine();
    meshLine.setPoints(points, widthCallback);
    return meshLine;
  }
  
  /**
   * Create progress indicator for trajectory
   */
  static createProgressMeshLine(
    points: THREE.Vector3[],
    progress: number,
    width: number = 0.15
  ): MeshLine {
    if (progress <= 0 || points.length < 2) {
      return new MeshLine();
    }
    
    const progressIndex = Math.floor(progress * (points.length - 1));
    const progressPoints = points.slice(0, Math.max(1, progressIndex + 1));
    
    const meshLine = new MeshLine();
    meshLine.setPoints(progressPoints, () => width);
    return meshLine;
  }
  
  /**
   * Create tapered line with varying width
   */
  static createTaperedMeshLine(
    points: THREE.Vector3[],
    startWidth: number = 0.2,
    endWidth: number = 0.05
  ): MeshLine {
    const meshLine = new MeshLine();
    meshLine.setPoints(points, (p: number) => {
      return startWidth + (endWidth - startWidth) * p;
    });
    return meshLine;
  }
}