/**
 * Mathematical utilities for 3D visualization
 * Inspired by Dash's coordinate system and trajectory calculations
 */

import * as THREE from 'three';

export class MathUtils {
  // Constants
  static readonly DEG_TO_RAD = Math.PI / 180;
  static readonly RAD_TO_DEG = 180 / Math.PI;
  static readonly EPSILON = 1e-6;
  
  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Linear interpolation between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  /**
   * Smooth step interpolation (cubic Hermite)
   */
  static smoothStep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  
  /**
   * Convert degrees to radians
   */
  static degToRad(degrees: number): number {
    return degrees * this.DEG_TO_RAD;
  }
  
  /**
   * Convert radians to degrees
   */
  static radToDeg(radians: number): number {
    return radians * this.RAD_TO_DEG;
  }
  
  /**
   * Calculate distance between two 3D points
   */
  static distance3D(a: THREE.Vector3, b: THREE.Vector3): number {
    try {
      // Ensure both points are valid Vector3 objects
      if (a && b && typeof a.distanceTo === 'function') {
        return a.distanceTo(b);
      } else {
        // Fallback to manual distance calculation
        const dx = (b?.x || 0) - (a?.x || 0);
        const dy = (b?.y || 0) - (a?.y || 0);
        const dz = (b?.z || 0) - (a?.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    } catch (error) {
      console.warn('Error calculating 3D distance:', error);
      return 0;
    }
  }
  
  /**
   * Calculate distance between two 2D points
   */
  static distance2D(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Normalize angle to [-π, π] range
   */
  static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  /**
   * Calculate angle between two vectors
   */
  static angleBetweenVectors(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.angleTo(b);
  }
  
  /**
   * Check if two numbers are approximately equal
   */
  static approximately(a: number, b: number, epsilon: number = this.EPSILON): boolean {
    return Math.abs(a - b) < epsilon;
  }
  
  /**
   * Calculate bezier curve point at parameter t
   */
  static bezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    const result = new THREE.Vector3();
    result.copy(p0).multiplyScalar(uuu);
    result.addScaledVector(p1, 3 * uu * t);
    result.addScaledVector(p2, 3 * u * tt);
    result.addScaledVector(p3, ttt);
    
    return result;
  }
  
  /**
   * Calculate cubic polynomial value at parameter t
   * f(t) = a + b*t + c*t² + d*t³
   */
  static cubicPolynomial(a: number, b: number, c: number, d: number, t: number): number {
    return a + b * t + c * t * t + d * t * t * t;
  }
  
  /**
   * Calculate cubic polynomial derivative at parameter t
   * f'(t) = b + 2*c*t + 3*d*t²
   */
  static cubicPolynomialDerivative(b: number, c: number, d: number, t: number): number {
    return b + 2 * c * t + 3 * d * t * t;
  }
  
  /**
   * Create rotation matrix from Euler angles (ZYX order)
   */
  static createRotationMatrix(yaw: number, pitch: number, roll: number): THREE.Matrix3 {
    const matrix = new THREE.Matrix3();
    const euler = new THREE.Euler(pitch, yaw, roll, 'ZYX');
    matrix.setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(euler));
    return matrix;
  }
  
  /**
   * Transform point by rotation matrix
   */
  static transformPoint(point: THREE.Vector3, rotationMatrix: THREE.Matrix3): THREE.Vector3 {
    return point.clone().applyMatrix3(rotationMatrix);
  }
  
  /**
   * Calculate arc length of a parametric curve using numerical integration
   */
  static calculateArcLength(
    curve: (t: number) => THREE.Vector3,
    startT: number,
    endT: number,
    samples: number = 100
  ): number {
    let length = 0;
    const dt = (endT - startT) / samples;
    let prevPoint = curve(startT);
    
    for (let i = 1; i <= samples; i++) {
      const t = startT + i * dt;
      const currentPoint = curve(t);
      length += prevPoint.distanceTo(currentPoint);
      prevPoint = currentPoint;
    }
    
    return length;
  }
  
  /**
   * Find parameter t for given arc length on a parametric curve
   */
  static findParameterForArcLength(
    curve: (t: number) => THREE.Vector3,
    targetLength: number,
    startT: number = 0,
    endT: number = 1,
    tolerance: number = 0.01
  ): number {
    let low = startT;
    let high = endT;
    
    while (high - low > tolerance) {
      const mid = (low + high) / 2;
      const length = this.calculateArcLength(curve, startT, mid);
      
      if (length < targetLength) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return (low + high) / 2;
  }
  
  /**
   * Generate points along a parametric curve
   */
  static generateCurvePoints(
    curve: (t: number) => THREE.Vector3,
    startT: number,
    endT: number,
    numPoints: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const dt = (endT - startT) / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
      const t = startT + i * dt;
      points.push(curve(t));
    }
    
    return points;
  }
  
  /**
   * Calculate bounding box for a set of points
   */
  static calculateBoundingBox(points: THREE.Vector3[]): { min: THREE.Vector3; max: THREE.Vector3 } {
    if (points.length === 0) {
      return {
        min: new THREE.Vector3(0, 0, 0),
        max: new THREE.Vector3(0, 0, 0)
      };
    }
    
    const min = points[0].clone();
    const max = points[0].clone();
    
    for (let i = 1; i < points.length; i++) {
      min.min(points[i]);
      max.max(points[i]);
    }
    
    return { min, max };
  }
  
  /**
   * Project point onto line segment
   */
  static projectPointOnLine(
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): { projectedPoint: THREE.Vector3; t: number; distance: number } {
    const line = lineEnd.clone().sub(lineStart);
    const lineLength = line.length();
    
    if (lineLength < this.EPSILON) {
      return {
        projectedPoint: lineStart.clone(),
        t: 0,
        distance: point.distanceTo(lineStart)
      };
    }
    
    const lineDirection = line.normalize();
    const toPoint = point.clone().sub(lineStart);
    const t = this.clamp(toPoint.dot(lineDirection) / lineLength, 0, 1);
    
    const projectedPoint = lineStart.clone().add(line.multiplyScalar(t));
    const distance = point.distanceTo(projectedPoint);
    
    return { projectedPoint, t, distance };
  }
  
  /**
   * Check if point is inside polygon (2D)
   */
  static isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    const x = point.x;
    const y = point.y;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  /**
   * Calculate signed area of polygon (2D)
   */
  static polygonSignedArea(polygon: { x: number; y: number }[]): number {
    let area = 0;
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    
    return area / 2;
  }
  
  /**
   * Check if polygon is clockwise (2D)
   */
  static isPolygonClockwise(polygon: { x: number; y: number }[]): boolean {
    return this.polygonSignedArea(polygon) < 0;
  }
  
  /**
   * Generate UV coordinates for quad
   */
  static generateQuadUVs(width: number, height: number): number[] {
    return [
      0, 0,        // bottom-left
      width, 0,    // bottom-right
      width, height, // top-right
      0, height    // top-left
    ];
  }
  
  /**
   * Create transformation matrix from position, rotation, and scale
   */
  static createTransformMatrix(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    return matrix;
  }
  
  /**
   * Decompose transformation matrix
   */
  static decomposeBoundTransformMatrix(matrix: THREE.Matrix4): {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  } {
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    
    matrix.decompose(position, quaternion, scale);
    rotation.setFromQuaternion(quaternion);
    
    return { position, rotation, scale };
  }
}