/**
 * OpenDRIVE Parser - Converts .xodr files to 3D visualization data
 * Parses road networks and generates Three.js compatible geometry
 */

import * as THREE from 'three';
import { 
  OpenDriveFile, 
  OpenDriveRoad, 
  OpenDriveLaneSection,
  OpenDriveLane,
  OpenDriveJunction 
} from '../types/OpenDriveTypes';
import { 
  ParsedOpenDrive,
  RoadElement,
  JunctionElement
} from '../types/VisualizationTypes';
import { GeometryUtils } from '../utils/GeometryUtils';
import { MathUtils } from '../utils/MathUtils';

export class OpenDriveParser {
  private parser: DOMParser = new DOMParser();
  
  /**
   * Parse OpenDRIVE XML content
   */
  public async parseFromXML(xmlContent: string): Promise<ParsedOpenDrive> {
    try {
      const doc = this.parser.parseFromString(xmlContent, 'application/xml');
      
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
      }
      
      const openDriveElement = doc.querySelector('OpenDRIVE');
      if (!openDriveElement) {
        throw new Error('Invalid OpenDRIVE file: Missing OpenDRIVE root element');
      }
      
      return this.parseOpenDriveElement(openDriveElement);
      
    } catch (error: any) {
      console.error('OpenDRIVE parsing error:', error);
      throw new Error(`Failed to parse OpenDRIVE: ${error.message}`);
    }
  }
  
  /**
   * Parse OpenDRIVE element
   */
  private parseOpenDriveElement(element: Element): ParsedOpenDrive {
    const header = this.parseHeader(element.querySelector('header'));
    const roads = this.parseRoads(element.querySelectorAll('road'));
    const junctions = this.parseJunctions(element.querySelectorAll('junction'));
    
    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(roads, junctions);
    
    return {
      header,
      roads: roads.map(road => this.convertRoadToRenderData(road)),
      junctions: junctions.map(junction => this.convertJunctionToRenderData(junction)),
      coordinateSystem: header?.userData?.coordinateSystem || 'cartesian',
      boundingBox
    };
  }
  
  /**
   * Parse header information
   */
  private parseHeader(headerElement: Element | null): any {
    if (!headerElement) return null;
    
    return {
      revMajor: parseInt(headerElement.getAttribute('revMajor') || '1'),
      revMinor: parseInt(headerElement.getAttribute('revMinor') || '0'),
      name: headerElement.getAttribute('name') || '',
      version: headerElement.getAttribute('version') || '',
      date: headerElement.getAttribute('date') || '',
      north: parseFloat(headerElement.getAttribute('north') || '0'),
      south: parseFloat(headerElement.getAttribute('south') || '0'),
      east: parseFloat(headerElement.getAttribute('east') || '0'),
      west: parseFloat(headerElement.getAttribute('west') || '0'),
      vendor: headerElement.getAttribute('vendor') || '',
    };
  }
  
  /**
   * Parse roads from XML elements
   */
  private parseRoads(roadElements: NodeListOf<Element>): OpenDriveRoad[] {
    const roads: OpenDriveRoad[] = [];
    
    for (const roadElement of roadElements) {
      const road = this.parseRoad(roadElement);
      if (road) {
        roads.push(road);
      }
    }
    
    return roads;
  }
  
  /**
   * Parse single road element
   */
  private parseRoad(roadElement: Element): OpenDriveRoad | null {
    try {
      const id = roadElement.getAttribute('id');
      const name = roadElement.getAttribute('name') || '';
      const length = parseFloat(roadElement.getAttribute('length') || '0');
      const junction = roadElement.getAttribute('junction') || undefined;
      
      if (!id) {
        console.warn('Road missing ID, skipping');
        return null;
      }
      
      // Parse plan view geometry
      const planView = this.parsePlanView(roadElement.querySelector('planView'));
      
      // Parse elevation profile
      const elevationProfile = this.parseElevationProfile(roadElement.querySelector('elevationProfile'));
      
      // Parse lanes
      const lanes = this.parseLanes(roadElement.querySelector('lanes'));
      
      // Parse road links
      const linkElement = roadElement.querySelector('link');
      const predecessor = linkElement?.querySelector('predecessor') ? 
        this.parseRoadLink(linkElement.querySelector('predecessor')!) : undefined;
      const successor = linkElement?.querySelector('successor') ? 
        this.parseRoadLink(linkElement.querySelector('successor')!) : undefined;
      
      return {
        id,
        name,
        length,
        junction,
        predecessor,
        successor,
        planView,
        elevationProfile,
        lanes
      };
      
    } catch (error: any) {
      console.error(`Error parsing road ${roadElement.getAttribute('id')}:`, error);
      return null;
    }
  }
  
  /**
   * Parse plan view geometry
   */
  private parsePlanView(planViewElement: Element | null): any[] {
    if (!planViewElement) return [];
    
    const geometries: any[] = [];
    const geometryElements = planViewElement.querySelectorAll('geometry');
    
    for (const geomElement of geometryElements) {
      const geometry = this.parseGeometry(geomElement);
      if (geometry) {
        geometries.push(geometry);
      }
    }
    
    return geometries;
  }
  
  /**
   * Parse geometry element
   */
  private parseGeometry(geomElement: Element): any | null {
    const s = parseFloat(geomElement.getAttribute('s') || '0');
    const x = parseFloat(geomElement.getAttribute('x') || '0');
    const y = parseFloat(geomElement.getAttribute('y') || '0');
    const hdg = parseFloat(geomElement.getAttribute('hdg') || '0');
    const length = parseFloat(geomElement.getAttribute('length') || '0');
    
    // Determine geometry type
    const lineElement = geomElement.querySelector('line');
    const arcElement = geomElement.querySelector('arc');
    const spiralElement = geomElement.querySelector('spiral');
    const poly3Element = geomElement.querySelector('poly3');
    const paramPoly3Element = geomElement.querySelector('paramPoly3');
    
    let type: string;
    let specificData: any = {};
    
    if (lineElement) {
      type = 'line';
    } else if (arcElement) {
      type = 'arc';
      specificData.curvStart = parseFloat(arcElement.getAttribute('curvature') || '0');
    } else if (spiralElement) {
      type = 'spiral';
      specificData.curvStart = parseFloat(spiralElement.getAttribute('curvStart') || '0');
      specificData.curvEnd = parseFloat(spiralElement.getAttribute('curvEnd') || '0');
    } else if (poly3Element) {
      type = 'poly3';
      specificData.a = parseFloat(poly3Element.getAttribute('a') || '0');
      specificData.b = parseFloat(poly3Element.getAttribute('b') || '0');
      specificData.c = parseFloat(poly3Element.getAttribute('c') || '0');
      specificData.d = parseFloat(poly3Element.getAttribute('d') || '0');
    } else if (paramPoly3Element) {
      type = 'paramPoly3';
      specificData.aU = parseFloat(paramPoly3Element.getAttribute('aU') || '0');
      specificData.bU = parseFloat(paramPoly3Element.getAttribute('bU') || '0');
      specificData.cU = parseFloat(paramPoly3Element.getAttribute('cU') || '0');
      specificData.dU = parseFloat(paramPoly3Element.getAttribute('dU') || '0');
      specificData.aV = parseFloat(paramPoly3Element.getAttribute('aV') || '0');
      specificData.bV = parseFloat(paramPoly3Element.getAttribute('bV') || '0');
      specificData.cV = parseFloat(paramPoly3Element.getAttribute('cV') || '0');
      specificData.dV = parseFloat(paramPoly3Element.getAttribute('dV') || '0');
      specificData.pRange = paramPoly3Element.getAttribute('pRange') || 'arcLength';
    } else {
      console.warn('Unknown geometry type in element:', geomElement);
      return null;
    }
    
    return {
      s,
      x,
      y,
      hdg,
      length,
      type,
      ...specificData
    };
  }
  
  /**
   * Parse elevation profile
   */
  private parseElevationProfile(elevationElement: Element | null): any[] {
    if (!elevationElement) return [];
    
    const elevations: any[] = [];
    const elevationElements = elevationElement.querySelectorAll('elevation');
    
    for (const elevElement of elevationElements) {
      elevations.push({
        s: parseFloat(elevElement.getAttribute('s') || '0'),
        a: parseFloat(elevElement.getAttribute('a') || '0'),
        b: parseFloat(elevElement.getAttribute('b') || '0'),
        c: parseFloat(elevElement.getAttribute('c') || '0'),
        d: parseFloat(elevElement.getAttribute('d') || '0')
      });
    }
    
    return elevations;
  }
  
  /**
   * Parse lanes
   */
  private parseLanes(lanesElement: Element | null): any {
    if (!lanesElement) {
      return { laneSection: [] };
    }
    
    const laneOffsets: any[] = [];
    const laneOffsetElements = lanesElement.querySelectorAll('laneOffset');
    for (const offsetElement of laneOffsetElements) {
      laneOffsets.push({
        s: parseFloat(offsetElement.getAttribute('s') || '0'),
        a: parseFloat(offsetElement.getAttribute('a') || '0'),
        b: parseFloat(offsetElement.getAttribute('b') || '0'),
        c: parseFloat(offsetElement.getAttribute('c') || '0'),
        d: parseFloat(offsetElement.getAttribute('d') || '0')
      });
    }
    
    const laneSections: any[] = [];
    const laneSectionElements = lanesElement.querySelectorAll('laneSection');
    for (const sectionElement of laneSectionElements) {
      laneSections.push(this.parseLaneSection(sectionElement));
    }
    
    return {
      laneOffset: laneOffsets,
      laneSection: laneSections
    };
  }
  
  /**
   * Parse lane section
   */
  private parseLaneSection(sectionElement: Element): any {
    const s = parseFloat(sectionElement.getAttribute('s') || '0');
    const singleSide = sectionElement.getAttribute('singleSide') === 'true';
    
    // Parse center lane
    const centerElement = sectionElement.querySelector('center');
    const center = centerElement ? this.parseCenterLane(centerElement.querySelector('lane')!) : null;
    
    // Parse left lanes
    const leftElement = sectionElement.querySelector('left');
    const left = leftElement ? {
      lanes: Array.from(leftElement.querySelectorAll('lane')).map(lane => this.parseLane(lane))
    } : undefined;
    
    // Parse right lanes
    const rightElement = sectionElement.querySelector('right');
    const right = rightElement ? {
      lanes: Array.from(rightElement.querySelectorAll('lane')).map(lane => this.parseLane(lane))
    } : undefined;
    
    return {
      s,
      singleSide,
      left,
      center,
      right
    };
  }
  
  /**
   * Parse center lane
   */
  private parseCenterLane(laneElement: Element): any {
    return {
      id: 0,
      type: laneElement.getAttribute('type') || 'none',
      level: laneElement.getAttribute('level') === 'true',
      roadMark: this.parseRoadMarks(laneElement.querySelectorAll('roadMark'))
    };
  }
  
  /**
   * Parse lane
   */
  private parseLane(laneElement: Element): any {
    const id = parseInt(laneElement.getAttribute('id') || '0');
    const type = laneElement.getAttribute('type') || 'driving';
    const level = laneElement.getAttribute('level') === 'true';
    
    // Parse lane width
    const width = this.parseLaneWidths(laneElement.querySelectorAll('width'));
    
    // Parse road marks
    const roadMark = this.parseRoadMarks(laneElement.querySelectorAll('roadMark'));
    
    // Parse lane links
    const linkElement = laneElement.querySelector('link');
    const predecessor = linkElement?.querySelector('predecessor') ? 
      { id: parseInt(linkElement.querySelector('predecessor')!.getAttribute('id') || '0') } : undefined;
    const successor = linkElement?.querySelector('successor') ? 
      { id: parseInt(linkElement.querySelector('successor')!.getAttribute('id') || '0') } : undefined;
    
    return {
      id,
      type,
      level,
      predecessor,
      successor,
      width,
      roadMark
    };
  }
  
  /**
   * Parse lane widths
   */
  private parseLaneWidths(widthElements: NodeListOf<Element>): any[] {
    const widths: any[] = [];
    
    for (const widthElement of widthElements) {
      widths.push({
        sOffset: parseFloat(widthElement.getAttribute('sOffset') || '0'),
        a: parseFloat(widthElement.getAttribute('a') || '0'),
        b: parseFloat(widthElement.getAttribute('b') || '0'),
        c: parseFloat(widthElement.getAttribute('c') || '0'),
        d: parseFloat(widthElement.getAttribute('d') || '0')
      });
    }
    
    return widths;
  }
  
  /**
   * Parse road marks
   */
  private parseRoadMarks(roadMarkElements: NodeListOf<Element>): any[] {
    const roadMarks: any[] = [];
    
    for (const markElement of roadMarkElements) {
      roadMarks.push({
        sOffset: parseFloat(markElement.getAttribute('sOffset') || '0'),
        type: markElement.getAttribute('type') || 'none',
        weight: markElement.getAttribute('weight') || 'standard',
        color: markElement.getAttribute('color') || 'white',
        material: markElement.getAttribute('material') || '',
        width: parseFloat(markElement.getAttribute('width') || '0.15'),
        laneChange: markElement.getAttribute('laneChange') || 'both',
        height: parseFloat(markElement.getAttribute('height') || '0.01')
      });
    }
    
    return roadMarks;
  }
  
  /**
   * Parse road link
   */
  private parseRoadLink(linkElement: Element): any {
    return {
      elementType: linkElement.getAttribute('elementType') || 'road',
      elementId: linkElement.getAttribute('elementId') || '',
      contactPoint: linkElement.getAttribute('contactPoint') || undefined,
      elementS: linkElement.hasAttribute('elementS') ? 
        parseFloat(linkElement.getAttribute('elementS')!) : undefined,
      elementDir: linkElement.getAttribute('elementDir') || undefined
    };
  }
  
  /**
   * Parse junctions
   */
  private parseJunctions(junctionElements: NodeListOf<Element>): OpenDriveJunction[] {
    const junctions: OpenDriveJunction[] = [];
    
    for (const junctionElement of junctionElements) {
      const junction = this.parseJunction(junctionElement);
      if (junction) {
        junctions.push(junction);
      }
    }
    
    return junctions;
  }
  
  /**
   * Parse single junction
   */
  private parseJunction(junctionElement: Element): OpenDriveJunction | null {
    try {
      const id = junctionElement.getAttribute('id');
      const name = junctionElement.getAttribute('name') || '';
      const type = junctionElement.getAttribute('type') || '';
      
      if (!id) {
        console.warn('Junction missing ID, skipping');
        return null;
      }
      
      // Parse connections
      const connection: any[] = [];
      const connectionElements = junctionElement.querySelectorAll('connection');
      for (const connElement of connectionElements) {
        const conn = this.parseJunctionConnection(connElement);
        if (conn) {
          connection.push(conn);
        }
      }
      
      return {
        id,
        name,
        type,
        connection
      };
      
    } catch (error: any) {
      console.error(`Error parsing junction ${junctionElement.getAttribute('id')}:`, error);
      return null;
    }
  }
  
  /**
   * Parse junction connection
   */
  private parseJunctionConnection(connElement: Element): any | null {
    const id = connElement.getAttribute('id');
    const incomingRoad = connElement.getAttribute('incomingRoad');
    const connectingRoad = connElement.getAttribute('connectingRoad');
    const contactPoint = connElement.getAttribute('contactPoint');
    
    if (!id || !incomingRoad || !connectingRoad || !contactPoint) {
      console.warn('Junction connection missing required attributes');
      return null;
    }
    
    // Parse lane links
    const laneLink: any[] = [];
    const laneLinkElements = connElement.querySelectorAll('laneLink');
    for (const linkElement of laneLinkElements) {
      laneLink.push({
        from: parseInt(linkElement.getAttribute('from') || '0'),
        to: parseInt(linkElement.getAttribute('to') || '0')
      });
    }
    
    return {
      id,
      incomingRoad,
      connectingRoad,
      contactPoint,
      laneLink
    };
  }
  
  /**
   * Convert road data to render format
   */
  private convertRoadToRenderData(road: OpenDriveRoad): RoadElement {
    // Generate centerline geometry
    const centerlinePoints = this.generateCenterlinePoints(road.planView);
    
    // Apply elevation if available
    if (road.elevationProfile && road.elevationProfile.length > 0) {
      this.applyElevationToPoints(centerlinePoints, road.elevationProfile, road.length);
    }
    
    // Create road geometry
    const geometry = GeometryUtils.createRoadGeometry(road.planView, 7.0, 50); // 7m total width
    GeometryUtils.optimizeGeometry(geometry);
    
    // Create material
    const material = new THREE.MeshLambertMaterial({
      color: 0x404040,
      side: THREE.DoubleSide
    });
    
    return {
      id: road.id,
      geometry,
      material,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0)
    };
  }
  
  /**
   * Convert junction data to render format
   */
  private convertJunctionToRenderData(junction: OpenDriveJunction): JunctionElement {
    // Calculate junction center (simplified)
    const position = new THREE.Vector3(0, 0, 0); // TODO: Calculate from connections
    
    // Create simple junction geometry (placeholder)
    const geometry = new THREE.CircleGeometry(5, 16);
    const material = new THREE.MeshLambertMaterial({
      color: 0x606060,
      transparent: true,
      opacity: 0.8
    });
    
    return {
      id: junction.id,
      position,
      connections: junction.connection.map(conn => conn.id),
      geometry
    };
  }
  
  /**
   * Generate centerline points from plan view
   */
  private generateCenterlinePoints(planView: any[]): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    
    for (const geometry of planView) {
      const segmentPoints = GeometryUtils.generateGeometryPoints(geometry, 50);
      points.push(...segmentPoints);
    }
    
    return points;
  }
  
  /**
   * Apply elevation profile to points
   */
  private applyElevationToPoints(
    points: THREE.Vector3[],
    elevationProfile: any[],
    roadLength: number
  ): void {
    for (let i = 0; i < points.length; i++) {
      const s = (i / (points.length - 1)) * roadLength;
      const elevation = this.getElevationAtS(elevationProfile, s);
      points[i].z = elevation;
    }
  }
  
  /**
   * Get elevation at parameter s
   */
  private getElevationAtS(elevationProfile: any[], s: number): number {
    if (elevationProfile.length === 0) {
      return 0;
    }
    
    // Find the appropriate elevation entry
    let activeElevation = elevationProfile[0];
    for (const elevation of elevationProfile) {
      if (elevation.s <= s) {
        activeElevation = elevation;
      } else {
        break;
      }
    }
    
    const ds = s - activeElevation.s;
    return MathUtils.cubicPolynomial(
      activeElevation.a,
      activeElevation.b,
      activeElevation.c,
      activeElevation.d,
      ds
    );
  }
  
  /**
   * Calculate bounding box for all roads and junctions
   */
  private calculateBoundingBox(roads: any[], junctions: any[]): { min: THREE.Vector3; max: THREE.Vector3 } {
    const points: THREE.Vector3[] = [];
    
    // Collect points from roads
    for (const road of roads) {
      if (road.planView) {
        const roadPoints = this.generateCenterlinePoints(road.planView);
        points.push(...roadPoints);
      }
    }
    
    // Add junction positions (simplified)
    for (const junction of junctions) {
      points.push(new THREE.Vector3(0, 0, 0)); // TODO: Calculate actual positions
    }
    
    return MathUtils.calculateBoundingBox(points);
  }
  
  /**
   * Validate parsed data
   */
  public validateParsedData(data: ParsedOpenDrive): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required elements
    if (!data.roads || data.roads.length === 0) {
      errors.push('No roads found in OpenDRIVE file');
    }
    
    // Validate road data
    for (const road of data.roads) {
      if (!road.id) {
        errors.push('Road missing ID');
      }
      if (!road.geometry) {
        errors.push(`Road ${road.id} missing geometry`);
      }
    }
    
    // Check bounding box
    if (!data.boundingBox) {
      errors.push('Missing bounding box calculation');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}