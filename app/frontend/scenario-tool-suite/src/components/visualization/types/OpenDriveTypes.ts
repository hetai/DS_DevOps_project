/**
 * OpenDRIVE file format types for road network parsing
 * Based on ASAM OpenDRIVE standard
 */

export interface OpenDriveFile {
  header: OpenDriveHeader;
  roads: OpenDriveRoad[];
  junctions?: OpenDriveJunction[];
  controllers?: OpenDriveController[];
  objects?: OpenDriveObject[];
}

export interface OpenDriveHeader {
  revMajor: number;
  revMinor: number;
  name?: string;
  version?: string;
  date?: string;
  north: number;
  south: number;
  east: number;
  west: number;
  vendor?: string;
  userData?: any[];
}

export interface OpenDriveRoad {
  id: string;
  name?: string;
  length: number;
  junction?: string;
  predecessor?: OpenDriveRoadLink;
  successor?: OpenDriveRoadLink;
  neighbor?: OpenDriveRoadNeighbor[];
  type?: OpenDriveRoadType[];
  planView: OpenDrivePlanViewGeometry[];
  elevationProfile?: OpenDriveElevation[];
  lateralProfile?: OpenDriveLateralProfile[];
  lanes: OpenDriveLanes;
  objects?: OpenDriveRoadObject[];
  signals?: OpenDriveSignal[];
  surface?: OpenDriveSurface[];
}

export interface OpenDriveRoadLink {
  elementType: 'road' | 'junction';
  elementId: string;
  contactPoint?: 'start' | 'end';
  elementS?: number;
  elementDir?: string;
}

export interface OpenDriveRoadNeighbor {
  side: 'left' | 'right';
  elementId: string;
  direction: 'same' | 'opposite';
}

export interface OpenDriveRoadType {
  s: number;
  type: string;
  country?: string;
  speed?: OpenDriveSpeed;
}

export interface OpenDriveSpeed {
  max: number;
  unit: 'mph' | 'kmh' | 'ms';
}

// Geometry types
export interface OpenDrivePlanViewGeometry {
  s: number;
  x: number;
  y: number;
  hdg: number;
  length: number;
  type: 'line' | 'spiral' | 'arc' | 'poly3' | 'paramPoly3';
  // Specific parameters for each geometry type
  curvStart?: number;
  curvEnd?: number;
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  aU?: number;
  bU?: number;
  cU?: number;
  dU?: number;
  aV?: number;
  bV?: number;
  cV?: number;
  dV?: number;
  pRange?: 'arcLength' | 'normalized';
}

export interface OpenDriveElevation {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface OpenDriveLateralProfile {
  superelevation?: OpenDriveSuperelevation[];
  crossfall?: OpenDriveCrossfall[];
  shape?: OpenDriveShape[];
}

export interface OpenDriveSuperelevation {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface OpenDriveCrossfall {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
  side: 'left' | 'right' | 'both';
}

export interface OpenDriveShape {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
  t: number;
}

// Lane types
export interface OpenDriveLanes {
  laneOffset?: OpenDriveLaneOffset[];
  laneSection: OpenDriveLaneSection[];
}

export interface OpenDriveLaneOffset {
  s: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface OpenDriveLaneSection {
  s: number;
  singleSide?: boolean;
  left?: OpenDriveLaneSectionSide;
  center: OpenDriveLaneSectionCenter;
  right?: OpenDriveLaneSectionSide;
}

export interface OpenDriveLaneSectionSide {
  lanes: OpenDriveLane[];
}

export interface OpenDriveLaneSectionCenter {
  lane: OpenDriveCenterLane;
}

export interface OpenDriveLane {
  id: number;
  type: string;
  level?: boolean;
  predecessor?: OpenDriveLaneLink;
  successor?: OpenDriveLaneLink;
  width?: OpenDriveLaneWidth[];
  border?: OpenDriveLaneBorder[];
  roadMark?: OpenDriveRoadMark[];
  material?: OpenDriveLaneMaterial[];
  speed?: OpenDriveLaneSpeed[];
  access?: OpenDriveLaneAccess[];
  height?: OpenDriveLaneHeight[];
  rule?: OpenDriveLaneRule[];
}

export interface OpenDriveCenterLane {
  id: 0;
  type: string;
  level?: boolean;
  roadMark?: OpenDriveRoadMark[];
}

export interface OpenDriveLaneLink {
  id: number;
}

export interface OpenDriveLaneWidth {
  sOffset: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface OpenDriveLaneBorder {
  sOffset: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface OpenDriveRoadMark {
  sOffset: number;
  type: string;
  weight?: string;
  color: string;
  material?: string;
  width?: number;
  laneChange?: string;
  height?: number;
}

export interface OpenDriveLaneMaterial {
  sOffset: number;
  surface: string;
  friction: number;
  roughness: number;
}

export interface OpenDriveLaneSpeed {
  sOffset: number;
  max: number;
  unit: string;
}

export interface OpenDriveLaneAccess {
  sOffset: number;
  restriction: string;
}

export interface OpenDriveLaneHeight {
  sOffset: number;
  inner: number;
  outer: number;
}

export interface OpenDriveLaneRule {
  sOffset: number;
  value: string;
}

// Junction types
export interface OpenDriveJunction {
  id: string;
  name?: string;
  type?: string;
  connection: OpenDriveJunctionConnection[];
  priority?: OpenDriveJunctionPriority[];
  controller?: OpenDriveJunctionController[];
  surface?: OpenDriveSurface[];
}

export interface OpenDriveJunctionConnection {
  id: string;
  incomingRoad: string;
  connectingRoad: string;
  contactPoint: 'start' | 'end';
  connectionMaster?: string;
  type?: string;
  laneLink: OpenDriveJunctionLaneLink[];
}

export interface OpenDriveJunctionLaneLink {
  from: number;
  to: number;
}

export interface OpenDriveJunctionPriority {
  high: string;
  low: string;
}

export interface OpenDriveJunctionController {
  id: string;
  type?: string;
  sequence?: number;
}

// Object types
export interface OpenDriveObject {
  type: string;
  name?: string;
  id: string;
  s: number;
  t: number;
  zOffset: number;
  validLength?: number;
  orientation: '+' | '-';
  radius?: number;
  length?: number;
  width?: number;
  height?: number;
  hdg?: number;
  pitch?: number;
  roll?: number;
}

export interface OpenDriveRoadObject extends OpenDriveObject {
  // Road-specific object properties
}

export interface OpenDriveSignal {
  s: number;
  t: number;
  id: string;
  name?: string;
  dynamic: 'yes' | 'no';
  orientation: '+' | '-';
  zOffset: number;
  country?: string;
  countryRevision?: string;
  type: string;
  subtype: string;
  value?: number;
  unit?: string;
  height?: number;
  width?: number;
  text?: string;
  hOffset?: number;
  pitch?: number;
  roll?: number;
}

export interface OpenDriveController {
  id: string;
  name?: string;
  sequence?: number;
  control: OpenDriveControllerControl[];
}

export interface OpenDriveControllerControl {
  signalId: string;
  type?: string;
}

export interface OpenDriveSurface {
  crg?: OpenDriveSurfaceCRG;
}

export interface OpenDriveSurfaceCRG {
  file: string;
  sStart: number;
  sEnd: number;
  orientation: string;
  mode: string;
  purpose?: string;
  zOffset?: number;
  zScale?: number;
  hOffset?: number;
}