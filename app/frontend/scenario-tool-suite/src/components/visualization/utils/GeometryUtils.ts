/**
 * Geometry utilities for OpenDRIVE and OpenSCENARIO visualization
 * Handles road network geometry, lane creation, and 3D mesh generation
 */

import * as THREE from 'three';
import { MathUtils } from './MathUtils';
import { OpenDrivePlanViewGeometry, OpenDriveLane, OpenDriveLaneWidth } from '../types/OpenDriveTypes';

export class GeometryUtils {
  /**
   * Create road geometry from OpenDRIVE plan view
   */
  static createRoadGeometry(
    planView: OpenDrivePlanViewGeometry[],
    width: number = 3.5,
    resolution: number = 50
  ): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    
    for (const geometry of planView) {
      const segmentPoints = this.generateGeometryPoints(geometry, resolution);
      points.push(...segmentPoints);
    }
    
    return this.createRoadMeshFromCenterline(points, width);
  }
  
  /**
   * Generate points for a specific geometry element
   */
  static generateGeometryPoints(
    geometry: OpenDrivePlanViewGeometry,
    resolution: number = 50
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const numPoints = Math.max(2, Math.ceil(geometry.length * resolution / 100));
    
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const s = t * geometry.length;
      const point = this.evaluateGeometry(geometry, s);
      points.push(point);
    }
    
    return points;
  }
  
  /**
   * Evaluate geometry at parameter s
   */
  static evaluateGeometry(geometry: OpenDrivePlanViewGeometry, s: number): THREE.Vector3 {
    const { x, y, hdg } = geometry;
    
    switch (geometry.type) {
      case 'line':
        return this.evaluateLine(x, y, hdg, s);
      
      case 'arc':
        return this.evaluateArc(x, y, hdg, s, geometry.curvStart || 0);
      
      case 'spiral':
        return this.evaluateSpiral(x, y, hdg, s, geometry.curvStart || 0, geometry.curvEnd || 0);
      
      case 'poly3':
        return this.evaluatePoly3(x, y, hdg, s, geometry.a || 0, geometry.b || 0, geometry.c || 0, geometry.d || 0);
      
      case 'paramPoly3':
        return this.evaluateParamPoly3(
          x, y, hdg, s,
          geometry.aU || 0, geometry.bU || 0, geometry.cU || 0, geometry.dU || 0,
          geometry.aV || 0, geometry.bV || 0, geometry.cV || 0, geometry.dV || 0,
          geometry.pRange === 'normalized'
        );
      
      default:
        console.warn(`Unsupported geometry type: ${geometry.type}`);
        return new THREE.Vector3(x, y, 0);
    }
  }
  
  /**
   * Evaluate line geometry
   */
  static evaluateLine(x: number, y: number, hdg: number, s: number): THREE.Vector3 {
    const dx = s * Math.cos(hdg);
    const dy = s * Math.sin(hdg);
    return new THREE.Vector3(x + dx, y + dy, 0);
  }
  
  /**
   * Evaluate arc geometry
   */
  static evaluateArc(x: number, y: number, hdg: number, s: number, curvature: number): THREE.Vector3 {
    if (Math.abs(curvature) < MathUtils.EPSILON) {
      return this.evaluateLine(x, y, hdg, s);
    }
    
    const radius = 1 / curvature;
    const angle = s * curvature;
    
    // Center of the arc
    const cx = x - radius * Math.sin(hdg);
    const cy = y + radius * Math.cos(hdg);
    
    // Point on arc
    const pointAngle = hdg - Math.PI / 2 + angle;
    const px = cx + radius * Math.cos(pointAngle);
    const py = cy + radius * Math.sin(pointAngle);
    
    return new THREE.Vector3(px, py, 0);
  }
  
  /**
   * Evaluate spiral (clothoid) geometry
   */
  static evaluateSpiral(
    x: number, y: number, hdg: number, s: number,
    curvStart: number, curvEnd: number
  ): THREE.Vector3 {
    // Simplified clothoid implementation
    // For production, consider using a proper clothoid library
    const curvRate = (curvEnd - curvStart) / s;
    const curvature = curvStart + curvRate * s / 2;
    
    // Approximate with arc
    return this.evaluateArc(x, y, hdg, s, curvature);
  }
  
  /**
   * Evaluate polynomial geometry
   */
  static evaluatePoly3(
    x: number, y: number, hdg: number, s: number,
    a: number, b: number, c: number, d: number
  ): THREE.Vector3 {
    const t = MathUtils.cubicPolynomial(a, b, c, d, s);
    const dx = s * Math.cos(hdg) - t * Math.sin(hdg);
    const dy = s * Math.sin(hdg) + t * Math.cos(hdg);
    
    return new THREE.Vector3(x + dx, y + dy, 0);
  }
  
  /**
   * Evaluate parametric polynomial geometry
   */
  static evaluateParamPoly3(
    x: number, y: number, hdg: number, s: number,
    aU: number, bU: number, cU: number, dU: number,
    aV: number, bV: number, cV: number, dV: number,
    normalized: boolean = false
  ): THREE.Vector3 {
    const p = normalized ? s : s;
    const u = MathUtils.cubicPolynomial(aU, bU, cU, dU, p);
    const v = MathUtils.cubicPolynomial(aV, bV, cV, dV, p);
    
    const cosHdg = Math.cos(hdg);
    const sinHdg = Math.sin(hdg);
    
    const dx = u * cosHdg - v * sinHdg;
    const dy = u * sinHdg + v * cosHdg;
    
    return new THREE.Vector3(x + dx, y + dy, 0);
  }
  
  /**
   * Create road mesh from centerline points
   */
  static createRoadMeshFromCenterline(
    centerline: THREE.Vector3[],
    width: number,
    elevation?: number[]
  ): THREE.BufferGeometry {
    if (centerline.length < 2) {
      return new THREE.BufferGeometry();
    }
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    // Calculate segment lengths for UV mapping
    for (let i = 1; i < centerline.length; i++) {
      const length = centerline[i - 1].distanceTo(centerline[i]);
      segmentLengths.push(length);
      totalLength += length;
    }
    
    let currentLength = 0;
    
    for (let i = 0; i < centerline.length; i++) {
      const point = centerline[i];
      const nextPoint = centerline[Math.min(i + 1, centerline.length - 1)];
      const prevPoint = centerline[Math.max(i - 1, 0)];
      
      // Calculate direction vector
      let direction: THREE.Vector3;
      if (i === 0) {
        direction = nextPoint.clone().sub(point).normalize();
      } else if (i === centerline.length - 1) {
        direction = point.clone().sub(prevPoint).normalize();
      } else {
        direction = nextPoint.clone().sub(prevPoint).normalize();
      }
      
      // Calculate perpendicular vector (to the right)
      const right = new THREE.Vector3(-direction.y, direction.x, 0);
      
      // Create vertices for left and right side of road
      const leftPoint = point.clone().add(right.clone().multiplyScalar(-width / 2));
      const rightPoint = point.clone().add(right.clone().multiplyScalar(width / 2));
      
      // Apply elevation if provided
      if (elevation && elevation[i] !== undefined) {
        leftPoint.z = elevation[i];
        rightPoint.z = elevation[i];
      }
      
      // Add vertices
      vertices.push(leftPoint.x, leftPoint.y, leftPoint.z);
      vertices.push(rightPoint.x, rightPoint.y, rightPoint.z);
      
      // Add normals (pointing up)
      normals.push(0, 0, 1);
      normals.push(0, 0, 1);
      
      // Add UVs
      const v = i < segmentLengths.length ? currentLength / totalLength : 1;
      uvs.push(0, v); // Left side
      uvs.push(1, v); // Right side
      
      if (i < segmentLengths.length) {
        currentLength += segmentLengths[i];
      }
      
      // Create triangles (except for last point)
      if (i < centerline.length - 1) {
        const baseIndex = i * 2;
        
        // Triangle 1: left[i], right[i], left[i+1]
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        
        // Triangle 2: right[i], right[i+1], left[i+1]
        indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    return geometry;
  }
  
  /**
   * Create lane geometry with variable width
   */
  static createLaneGeometry(
    centerline: THREE.Vector3[],
    laneWidths: OpenDriveLaneWidth[],
    laneOffset: number = 0,
    sStart: number = 0,
    sEnd?: number
  ): THREE.BufferGeometry {
    if (centerline.length < 2) {
      return new THREE.BufferGeometry();
    }
    
    const totalLength = this.calculateCenterlineLength(centerline);
    const endS = sEnd || totalLength;
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    
    for (let i = 0; i < centerline.length; i++) {
      const s = (i / (centerline.length - 1)) * totalLength;
      
      if (s < sStart || s > endS) continue;
      
      const point = centerline[i];
      const width = this.getLaneWidthAtS(laneWidths, s - sStart);
      
      // Calculate direction and right vector
      const nextPoint = centerline[Math.min(i + 1, centerline.length - 1)];
      const prevPoint = centerline[Math.max(i - 1, 0)];
      
      let direction: THREE.Vector3;
      if (i === 0) {
        direction = nextPoint.clone().sub(point).normalize();
      } else if (i === centerline.length - 1) {
        direction = point.clone().sub(prevPoint).normalize();
      } else {
        direction = nextPoint.clone().sub(prevPoint).normalize();
      }
      
      const right = new THREE.Vector3(-direction.y, direction.x, 0);
      
      // Calculate lane boundaries
      const innerOffset = laneOffset;
      const outerOffset = laneOffset + width;
      
      const innerPoint = point.clone().add(right.clone().multiplyScalar(innerOffset));
      const outerPoint = point.clone().add(right.clone().multiplyScalar(outerOffset));
      
      // Add vertices
      const vertexIndex = vertices.length / 3;
      vertices.push(innerPoint.x, innerPoint.y, innerPoint.z);
      vertices.push(outerPoint.x, outerPoint.y, outerPoint.z);
      
      // Add normals
      normals.push(0, 0, 1);
      normals.push(0, 0, 1);
      
      // Add UVs
      const v = i / (centerline.length - 1);
      uvs.push(0, v);
      uvs.push(1, v);
      
      // Create triangles
      if (i > 0) {
        const prevVertexIndex = vertexIndex - 2;
        
        // Triangle 1
        indices.push(prevVertexIndex, prevVertexIndex + 1, vertexIndex);
        
        // Triangle 2
        indices.push(prevVertexIndex + 1, vertexIndex + 1, vertexIndex);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    return geometry;
  }
  
  /**
   * Get lane width at parameter s
   */
  static getLaneWidthAtS(laneWidths: OpenDriveLaneWidth[], s: number): number {
    if (laneWidths.length === 0) {
      return 3.5; // Default lane width
    }
    
    // Find the appropriate width entry
    let activeWidth = laneWidths[0];
    for (const width of laneWidths) {
      if (width.sOffset <= s) {
        activeWidth = width;
      } else {
        break;
      }
    }
    
    const ds = s - activeWidth.sOffset;
    return MathUtils.cubicPolynomial(activeWidth.a, activeWidth.b, activeWidth.c, activeWidth.d, ds);
  }
  
  /**
   * Calculate centerline length
   */
  static calculateCenterlineLength(centerline: THREE.Vector3[]): number {
    let length = 0;
    try {
      for (let i = 1; i < centerline.length; i++) {
        const p1 = centerline[i - 1];
        const p2 = centerline[i];
        
        // Ensure both points are valid Vector3 objects
        if (p1 && p2 && typeof p1.distanceTo === 'function') {
          length += p1.distanceTo(p2);
        } else {
          // Fallback to manual distance calculation
          const dx = (p2?.x || 0) - (p1?.x || 0);
          const dy = (p2?.y || 0) - (p1?.y || 0);
          const dz = (p2?.z || 0) - (p1?.z || 0);
          length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      }
    } catch (error) {
      console.warn('Error calculating centerline length:', error);
    }
    return length;
  }
  
  /**
   * Create vehicle geometry (simplified box for now)
   */
  static createVehicleGeometry(
    length: number = 4.5,
    width: number = 2.0,
    height: number = 1.5
  ): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(length, width, height);
    
    // Move pivot to center-bottom of vehicle
    geometry.translate(0, 0, height / 2);
    
    return geometry;
  }
  
  /**
   * Create trajectory line geometry
   */
  static createTrajectoryGeometry(
    points: THREE.Vector3[],
    lineWidth: number = 0.1
  ): THREE.BufferGeometry {
    if (points.length < 2) {
      return new THREE.BufferGeometry();
    }
    
    try {
      // Validate points are proper Vector3 objects
      const validPoints = points.filter(point => 
        point && 
        typeof point.x === 'number' && 
        typeof point.y === 'number' && 
        typeof point.z === 'number'
      );
      
      if (validPoints.length < 2) {
        console.warn('Not enough valid points for trajectory geometry');
        return new THREE.BufferGeometry();
      }
      
      // Create a tube geometry along the trajectory
      const curve = new THREE.CatmullRomCurve3(validPoints);
      const geometry = new THREE.TubeGeometry(curve, Math.max(2, validPoints.length * 2), lineWidth, 8, false);
      
      return geometry;
    } catch (error) {
      console.warn('Error creating trajectory geometry:', error);
      // Fallback to simple line geometry
      return this.createSimpleLineGeometry(points);
    }
  }
  
  /**
   * Create simple line geometry as fallback
   */
  private static createSimpleLineGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    for (const point of points) {
      if (point && typeof point.x === 'number') {
        positions.push(point.x, point.y || 0, point.z || 0);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }
  
  /**
   * Create arrow geometry for direction indicators
   */
  static createArrowGeometry(
    length: number = 2,
    headLength: number = 0.5,
    headWidth: number = 0.3,
    shaftWidth: number = 0.1
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const indices: number[] = [];
    
    // Arrow shaft
    const shaftHalfWidth = shaftWidth / 2;
    const shaftLength = length - headLength;
    
    // Shaft vertices
    vertices.push(-shaftLength / 2, -shaftHalfWidth, 0); // 0
    vertices.push(-shaftLength / 2, shaftHalfWidth, 0);  // 1
    vertices.push(shaftLength / 2, shaftHalfWidth, 0);   // 2
    vertices.push(shaftLength / 2, -shaftHalfWidth, 0);  // 3
    
    // Arrow head vertices
    const headHalfWidth = headWidth / 2;
    vertices.push(shaftLength / 2, -headHalfWidth, 0);   // 4
    vertices.push(shaftLength / 2, headHalfWidth, 0);    // 5
    vertices.push(length / 2, 0, 0);                     // 6 (tip)
    
    // Shaft triangles
    indices.push(0, 1, 2);
    indices.push(0, 2, 3);
    
    // Head triangles
    indices.push(4, 5, 6);
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return geometry;
  }
  
  /**
   * Create grid geometry for debug/reference
   */
  static createGridGeometry(
    size: number = 100,
    divisions: number = 10
  ): THREE.BufferGeometry {
    const step = size / divisions;
    const halfSize = size / 2;
    
    const vertices: number[] = [];
    
    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const y = -halfSize + i * step;
      vertices.push(-halfSize, y, 0);
      vertices.push(halfSize, y, 0);
    }
    
    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = -halfSize + i * step;
      vertices.push(x, -halfSize, 0);
      vertices.push(x, halfSize, 0);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    return geometry;
  }
  
  /**
   * Optimize geometry for performance
   */
  static optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    try {
      // Skip vertex merging for now - this was causing the error
      // In modern Three.js, BufferGeometry handles vertex optimization internally
      
      // Compute bounding sphere for frustum culling
      if (geometry && typeof geometry.computeBoundingSphere === 'function') {
        geometry.computeBoundingSphere();
      }
      
      // Compute vertex normals if not present
      if (geometry && !geometry.hasAttribute('normal') && typeof geometry.computeVertexNormals === 'function') {
        geometry.computeVertexNormals();
      }
      
      return geometry;
    } catch (error) {
      console.warn('Geometry optimization failed:', error);
      return geometry;
    }
  }
  
  /**
   * Create LOD (Level of Detail) geometries
   */
  static createLODGeometries(
    highDetail: THREE.BufferGeometry,
    lodLevels: number[] = [0.5, 0.25, 0.1]
  ): THREE.BufferGeometry[] {
    const lods: THREE.BufferGeometry[] = [highDetail];
    
    for (const factor of lodLevels) {
      // Simplified LOD creation - in production, use proper mesh simplification
      const simplified = highDetail.clone();
      
      // Reduce vertex count by sampling
      const positions = simplified.getAttribute('position');
      const newPositions: number[] = [];
      
      const step = Math.max(1, Math.floor(1 / factor));
      for (let i = 0; i < positions.count; i += step) {
        newPositions.push(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );
      }
      
      simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      simplified.computeVertexNormals();
      
      lods.push(simplified);
    }
    
    return lods;
  }
}