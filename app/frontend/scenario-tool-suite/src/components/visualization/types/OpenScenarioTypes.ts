/**
 * OpenSCENARIO file format types for scenario parsing
 * Based on ASAM OpenSCENARIO standard
 */

export interface OpenScenarioFile {
  fileHeader: OpenScenarioFileHeader;
  parameterDeclarations?: OpenScenarioParameterDeclaration[];
  catalogLocations?: OpenScenarioCatalogLocations;
  roadNetwork: OpenScenarioRoadNetwork;
  entities: OpenScenarioEntities;
  storyboard: OpenScenarioStoryboard;
}

export interface OpenScenarioFileHeader {
  revMajor: number;
  revMinor: number;
  date: string;
  description: string;
  name: string;
  author: string;
}

export interface OpenScenarioParameterDeclaration {
  name: string;
  parameterType: 'integer' | 'double' | 'string' | 'unsignedInt' | 'unsignedShort' | 'boolean' | 'dateTime';
  value: string;
}

export interface OpenScenarioCatalogLocations {
  vehicleCatalog?: OpenScenarioDirectory;
  pedestrianCatalog?: OpenScenarioDirectory;
  miscObjectCatalog?: OpenScenarioDirectory;
  environmentCatalog?: OpenScenarioDirectory;
  maneuverCatalog?: OpenScenarioDirectory;
  trajectoryCatalog?: OpenScenarioDirectory;
  routeCatalog?: OpenScenarioDirectory;
}

export interface OpenScenarioDirectory {
  directory: string;
}

export interface OpenScenarioRoadNetwork {
  logicFile?: OpenScenarioFile;
  sceneGraphFile?: OpenScenarioFile;
  trafficSignals?: OpenScenarioTrafficSignalController[];
}

export interface OpenScenarioFile {
  filepath: string;
}

export interface OpenScenarioTrafficSignalController {
  name: string;
  delay?: number;
  reference?: string;
  phases: OpenScenarioTrafficSignalState[];
}

export interface OpenScenarioTrafficSignalState {
  name: string;
  state: string;
  trafficSignals: OpenScenarioTrafficSignal[];
}

export interface OpenScenarioTrafficSignal {
  trafficSignalId: string;
  state: string;
}

// Entities
export interface OpenScenarioEntities {
  scenarioObjects: OpenScenarioScenarioObject[];
  entitySelections?: OpenScenarioEntitySelection[];
}

export interface OpenScenarioScenarioObject {
  name: string;
  catalogReference?: OpenScenarioCatalogReference;
  vehicle?: OpenScenarioVehicle;
  pedestrian?: OpenScenarioPedestrian;
  miscObject?: OpenScenarioMiscObject;
  externalObjectReference?: OpenScenarioExternalObjectReference;
}

export interface OpenScenarioCatalogReference {
  catalogName: string;
  entryName: string;
  parameterAssignments?: OpenScenarioParameterAssignment[];
}

export interface OpenScenarioParameterAssignment {
  parameterRef: string;
  value: string;
}

export interface OpenScenarioVehicle {
  name: string;
  vehicleCategory: string;
  boundingBox: OpenScenarioBoundingBox;
  performance: OpenScenarioPerformance;
  axles: OpenScenarioAxles;
  properties: OpenScenarioProperties;
}

export interface OpenScenarioBoundingBox {
  center: OpenScenarioCenter;
  dimensions: OpenScenarioDimensions;
}

export interface OpenScenarioCenter {
  x: number;
  y: number;
  z: number;
}

export interface OpenScenarioDimensions {
  width: number;
  length: number;
  height: number;
}

export interface OpenScenarioPerformance {
  maxSpeed: number;
  maxAcceleration: number;
  maxDeceleration: number;
}

export interface OpenScenarioAxles {
  frontAxle: OpenScenarioAxle;
  rearAxle: OpenScenarioAxle;
  additionalAxles?: OpenScenarioAxle[];
}

export interface OpenScenarioAxle {
  maxSteering: number;
  wheelDiameter: number;
  trackWidth: number;
  positionX: number;
  positionZ: number;
}

export interface OpenScenarioProperties {
  property: OpenScenarioProperty[];
}

export interface OpenScenarioProperty {
  name: string;
  value: string;
}

export interface OpenScenarioPedestrian {
  model: string;
  mass: number;
  name: string;
  pedestrianCategory: string;
  boundingBox: OpenScenarioBoundingBox;
  properties: OpenScenarioProperties;
}

export interface OpenScenarioMiscObject {
  mass?: number;
  name: string;
  miscObjectCategory: string;
  boundingBox: OpenScenarioBoundingBox;
  properties: OpenScenarioProperties;
}

export interface OpenScenarioExternalObjectReference {
  name: string;
}

export interface OpenScenarioEntitySelection {
  name: string;
  members: OpenScenarioEntityRef[];
}

export interface OpenScenarioEntityRef {
  entityRef: string;
}

// Storyboard
export interface OpenScenarioStoryboard {
  init: OpenScenarioInit;
  story: OpenScenarioStory[];
  stopTrigger: OpenScenarioTrigger;
}

export interface OpenScenarioInit {
  actions: OpenScenarioInitActions;
}

export interface OpenScenarioInitActions {
  global?: OpenScenarioGlobalAction[];
  userDefined?: OpenScenarioUserDefinedAction[];
  private: OpenScenarioPrivateAction[];
}

export interface OpenScenarioGlobalAction {
  environmentAction?: OpenScenarioEnvironmentAction;
  entityAction?: OpenScenarioEntityAction;
  parameterAction?: OpenScenarioParameterAction;
  infrastructureAction?: OpenScenarioInfrastructureAction;
  trafficAction?: OpenScenarioTrafficAction;
}

export interface OpenScenarioPrivateAction {
  entityRef: string;
  longitudinalAction?: OpenScenarioLongitudinalAction;
  lateralAction?: OpenScenarioLateralAction;
  visibilityAction?: OpenScenarioVisibilityAction;
  synchronizeAction?: OpenScenarioSynchronizeAction;
  activateControllerAction?: OpenScenarioActivateControllerAction;
  controllerAction?: OpenScenarioControllerAction;
  teleportAction?: OpenScenarioTeleportAction;
  routingAction?: OpenScenarioRoutingAction;
}

export interface OpenScenarioUserDefinedAction {
  customCommandAction?: OpenScenarioCustomCommandAction;
}

export interface OpenScenarioStory {
  name: string;
  parameterDeclarations?: OpenScenarioParameterDeclaration[];
  act: OpenScenarioAct[];
}

export interface OpenScenarioAct {
  name: string;
  maneuverGroup: OpenScenarioManeuverGroup[];
  startTrigger: OpenScenarioTrigger;
  stopTrigger?: OpenScenarioTrigger;
}

export interface OpenScenarioManeuverGroup {
  maximumExecutionCount: number;
  name: string;
  actors: OpenScenarioActors;
  maneuver: OpenScenarioManeuver[];
}

export interface OpenScenarioActors {
  selectTriggeringEntities: boolean;
  entityRef: OpenScenarioEntityRef[];
}

export interface OpenScenarioManeuver {
  name: string;
  parameterDeclarations?: OpenScenarioParameterDeclaration[];
  event: OpenScenarioEvent[];
}

export interface OpenScenarioEvent {
  name: string;
  priority: 'overwrite' | 'skip' | 'parallel';
  maximumExecutionCount?: number;
  startTrigger: OpenScenarioTrigger;
  action: OpenScenarioAction[];
}

export interface OpenScenarioAction {
  name: string;
  userDefinedAction?: OpenScenarioUserDefinedAction;
  privateAction?: OpenScenarioPrivateAction;
}

export interface OpenScenarioTrigger {
  conditionGroup: OpenScenarioConditionGroup[];
}

export interface OpenScenarioConditionGroup {
  condition: OpenScenarioCondition[];
}

export interface OpenScenarioCondition {
  name: string;
  delay?: number;
  conditionEdge: 'rising' | 'falling' | 'risingOrFalling' | 'none';
  byEntityCondition?: OpenScenarioByEntityCondition;
  byValueCondition?: OpenScenarioByValueCondition;
}

export interface OpenScenarioByEntityCondition {
  triggeringEntities: OpenScenarioTriggeringEntities;
  condition: OpenScenarioEntityCondition;
}

export interface OpenScenarioTriggeringEntities {
  triggeringEntitiesRule: 'any' | 'all';
  entityRef: OpenScenarioEntityRef[];
}

export interface OpenScenarioEntityCondition {
  endOfRoadCondition?: OpenScenarioEndOfRoadCondition;
  collisionCondition?: OpenScenarioCollisionCondition;
  offroadCondition?: OpenScenarioOffroadCondition;
  timeHeadwayCondition?: OpenScenarioTimeHeadwayCondition;
  timeToCollisionCondition?: OpenScenarioTimeToCollisionCondition;
  accelerationCondition?: OpenScenarioAccelerationCondition;
  standStillCondition?: OpenScenarioStandStillCondition;
  speedCondition?: OpenScenarioSpeedCondition;
  relativeSpeedCondition?: OpenScenarioRelativeSpeedCondition;
  traveledDistanceCondition?: OpenScenarioTraveledDistanceCondition;
  reachPositionCondition?: OpenScenarioReachPositionCondition;
  distanceCondition?: OpenScenarioDistanceCondition;
  relativeDistanceCondition?: OpenScenarioRelativeDistanceCondition;
}

export interface OpenScenarioByValueCondition {
  parameterCondition?: OpenScenarioParameterCondition;
  timeOfDayCondition?: OpenScenarioTimeOfDayCondition;
  simulationTimeCondition?: OpenScenarioSimulationTimeCondition;
  storyboardElementStateCondition?: OpenScenarioStoryboardElementStateCondition;
  userDefinedValueCondition?: OpenScenarioUserDefinedValueCondition;
  trafficSignalCondition?: OpenScenarioTrafficSignalCondition;
  trafficSignalControllerCondition?: OpenScenarioTrafficSignalControllerCondition;
}

// Position types
export interface OpenScenarioPosition {
  worldPosition?: OpenScenarioWorldPosition;
  relativeWorldPosition?: OpenScenarioRelativeWorldPosition;
  relativeObjectPosition?: OpenScenarioRelativeObjectPosition;
  roadPosition?: OpenScenarioRoadPosition;
  relativeRoadPosition?: OpenScenarioRelativeRoadPosition;
  lanePosition?: OpenScenarioLanePosition;
  relativeLanePosition?: OpenScenarioRelativeLanePosition;
}

export interface OpenScenarioWorldPosition {
  x: number;
  y: number;
  z?: number;
  h?: number;
  p?: number;
  r?: number;
}

export interface OpenScenarioRelativeWorldPosition {
  entityRef: string;
  dx: number;
  dy: number;
  dz?: number;
  orientation?: OpenScenarioOrientation;
}

export interface OpenScenarioOrientation {
  type: 'absolute' | 'relative';
  h?: number;
  p?: number;
  r?: number;
}

export interface OpenScenarioRelativeObjectPosition {
  entityRef: string;
  dx: number;
  dy: number;
  dz?: number;
  orientation?: OpenScenarioOrientation;
}

export interface OpenScenarioRoadPosition {
  roadId: string;
  s: number;
  t: number;
  orientation?: OpenScenarioOrientation;
}

export interface OpenScenarioRelativeRoadPosition {
  entityRef: string;
  ds: number;
  dt: number;
  orientation?: OpenScenarioOrientation;
}

export interface OpenScenarioLanePosition {
  roadId: string;
  laneId: string;
  s: number;
  offset?: number;
  orientation?: OpenScenarioOrientation;
}

export interface OpenScenarioRelativeLanePosition {
  entityRef: string;
  dLane: number;
  ds: number;
  offset?: number;
  orientation?: OpenScenarioOrientation;
}

// Action types (basic definitions - many more exist in full spec)
export interface OpenScenarioLongitudinalAction {
  speedAction?: OpenScenarioSpeedAction;
  longitudinalDistanceAction?: OpenScenarioLongitudinalDistanceAction;
}

export interface OpenScenarioLateralAction {
  laneChangeAction?: OpenScenarioLaneChangeAction;
  laneOffsetAction?: OpenScenarioLaneOffsetAction;
  lateralDistanceAction?: OpenScenarioLateralDistanceAction;
}

export interface OpenScenarioSpeedAction {
  speedActionDynamics: OpenScenarioTransitionDynamics;
  speedTarget: OpenScenarioSpeedTarget;
}

export interface OpenScenarioTransitionDynamics {
  dynamicsShape: 'linear' | 'cubic' | 'sinusoidal' | 'step';
  value: number;
  dynamicsDimension: 'rate' | 'time' | 'distance';
}

export interface OpenScenarioSpeedTarget {
  relativeTargetSpeed?: OpenScenarioRelativeTargetSpeed;
  absoluteTargetSpeed?: OpenScenarioAbsoluteTargetSpeed;
}

export interface OpenScenarioRelativeTargetSpeed {
  entityRef: string;
  value: number;
  speedTargetValueType: 'delta' | 'factor';
}

export interface OpenScenarioAbsoluteTargetSpeed {
  value: number;
}

// Condition types (basic definitions)
export interface OpenScenarioEndOfRoadCondition {
  duration: number;
}

export interface OpenScenarioCollisionCondition {
  target: OpenScenarioCollisionTarget;
}

export interface OpenScenarioCollisionTarget {
  position?: OpenScenarioPosition;
  byType?: OpenScenarioByObjectType;
}

export interface OpenScenarioByObjectType {
  type: string;
}

export interface OpenScenarioOffroadCondition {
  duration: number;
}

export interface OpenScenarioTimeHeadwayCondition {
  entityRef: string;
  value: number;
  freespace: boolean;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioSpeedCondition {
  value: number;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioStandStillCondition {
  duration: number;
}

export interface OpenScenarioAccelerationCondition {
  value: number;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioReachPositionCondition {
  position: OpenScenarioPosition;
  tolerance: number;
}

export interface OpenScenarioDistanceCondition {
  position: OpenScenarioPosition;
  value: number;
  freespace: boolean;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioSimulationTimeCondition {
  value: number;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioParameterCondition {
  parameterRef: string;
  value: string;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioStoryboardElementStateCondition {
  storyboardElementType: 'story' | 'act' | 'maneuverGroup' | 'maneuver' | 'event' | 'action';
  storyboardElementRef: string;
  state: 'startTransition' | 'endTransition' | 'stopTransition' | 'skipTransition' | 'completeState' | 'runningState' | 'standbyState';
}

// Additional action types
export interface OpenScenarioTeleportAction {
  position: OpenScenarioPosition;
}

export interface OpenScenarioLaneChangeAction {
  targetLaneOffset?: number;
  laneChangeActionDynamics: OpenScenarioTransitionDynamics;
  laneChangeTarget: OpenScenarioLaneChangeTarget;
}

export interface OpenScenarioLaneChangeTarget {
  relativeTargetLane?: OpenScenarioRelativeTargetLane;
  absoluteTargetLane?: OpenScenarioAbsoluteTargetLane;
}

export interface OpenScenarioRelativeTargetLane {
  entityRef: string;
  value: number;
}

export interface OpenScenarioAbsoluteTargetLane {
  value: string;
}

export interface OpenScenarioVisibilityAction {
  graphics: boolean;
  traffic: boolean;
  sensors: boolean;
}

export interface OpenScenarioSynchronizeAction {
  targetEntityRef: string;
  targetPosition: OpenScenarioPosition;
  targetPositionMaster: OpenScenarioPosition;
  freespace: boolean;
}

export interface OpenScenarioActivateControllerAction {
  longitudinal?: boolean;
  lateral?: boolean;
}

export interface OpenScenarioControllerAction {
  assignControllerAction?: OpenScenarioAssignControllerAction;
  overrideControllerValueAction?: OpenScenarioOverrideControllerValueAction;
}

export interface OpenScenarioAssignControllerAction {
  controller?: OpenScenarioController;
  catalogReference?: OpenScenarioCatalogReference;
}

export interface OpenScenarioController {
  name: string;
  properties: OpenScenarioProperties;
}

export interface OpenScenarioOverrideControllerValueAction {
  throttle?: OpenScenarioOverrideThrottleAction;
  brake?: OpenScenarioOverrideBrakeAction;
  clutch?: OpenScenarioOverrideClutchAction;
  parkingBrake?: OpenScenarioOverrideParkingBrakeAction;
  steeringWheel?: OpenScenarioOverrideSteeringWheelAction;
  gear?: OpenScenarioOverrideGearAction;
}

export interface OpenScenarioOverrideThrottleAction {
  value: number;
  active: boolean;
}

export interface OpenScenarioOverrideBrakeAction {
  value: number;
  active: boolean;
}

export interface OpenScenarioOverrideClutchAction {
  value: number;
  active: boolean;
}

export interface OpenScenarioOverrideParkingBrakeAction {
  value: number;
  active: boolean;
}

export interface OpenScenarioOverrideSteeringWheelAction {
  value: number;
  active: boolean;
}

export interface OpenScenarioOverrideGearAction {
  number?: number;
  automatic?: boolean;
  active: boolean;
}

export interface OpenScenarioEnvironmentAction {
  environment?: OpenScenarioEnvironment;
  catalogReference?: OpenScenarioCatalogReference;
}

export interface OpenScenarioEnvironment {
  name: string;
  parameterDeclarations?: OpenScenarioParameterDeclaration[];
  timeOfDay?: OpenScenarioTimeOfDay;
  weather?: OpenScenarioWeather;
  roadCondition?: OpenScenarioRoadCondition;
}

export interface OpenScenarioTimeOfDay {
  animation: boolean;
  dateTime: string;
}

export interface OpenScenarioWeather {
  cloudState?: 'free' | 'cloudy' | 'overcast' | 'rainy' | 'skyOff';
  sun?: OpenScenarioSun;
  fog?: OpenScenarioFog;
  precipitation?: OpenScenarioPrecipitation;
}

export interface OpenScenarioSun {
  intensity: number;
  azimuth: number;
  elevation: number;
}

export interface OpenScenarioFog {
  visualRange: number;
}

export interface OpenScenarioPrecipitation {
  precipitationType: 'dry' | 'rain' | 'snow';
  intensity: number;
}

export interface OpenScenarioRoadCondition {
  frictionScaleFactor: number;
}

export interface OpenScenarioEntityAction {
  entityRef: string;
  addEntityAction?: OpenScenarioAddEntityAction;
  deleteEntityAction?: OpenScenarioDeleteEntityAction;
}

export interface OpenScenarioAddEntityAction {
  position: OpenScenarioPosition;
}

export interface OpenScenarioDeleteEntityAction {
  // No additional properties
}

export interface OpenScenarioParameterAction {
  parameterRef: string;
  setAction?: OpenScenarioParameterSetAction;
  modifyAction?: OpenScenarioParameterModifyAction;
}

export interface OpenScenarioParameterSetAction {
  value: string;
}

export interface OpenScenarioParameterModifyAction {
  rule: OpenScenarioModifyRule;
  value: string;
}

export interface OpenScenarioModifyRule {
  addValue?: OpenScenarioParameterAddValueRule;
  multiplyByValue?: OpenScenarioParameterMultiplyByValueRule;
}

export interface OpenScenarioParameterAddValueRule {
  value: number;
}

export interface OpenScenarioParameterMultiplyByValueRule {
  value: number;
}

export interface OpenScenarioInfrastructureAction {
  trafficSignalAction?: OpenScenarioTrafficSignalAction;
}

export interface OpenScenarioTrafficSignalAction {
  trafficSignalControllerAction?: OpenScenarioTrafficSignalControllerAction;
  trafficSignalStateAction?: OpenScenarioTrafficSignalStateAction;
}

export interface OpenScenarioTrafficSignalControllerAction {
  trafficSignalControllerRef: string;
  phase?: string;
}

export interface OpenScenarioTrafficSignalStateAction {
  name: string;
  state: string;
}

export interface OpenScenarioTrafficAction {
  trafficSourceAction?: OpenScenarioTrafficSourceAction;
  trafficSinkAction?: OpenScenarioTrafficSinkAction;
  trafficSwarmAction?: OpenScenarioTrafficSwarmAction;
}

export interface OpenScenarioTrafficSourceAction {
  rate: number;
  radius?: number;
  position: OpenScenarioPosition;
  trafficDefinition: OpenScenarioTrafficDefinition;
}

export interface OpenScenarioTrafficSinkAction {
  radius?: number;
  position: OpenScenarioPosition;
  trafficDefinition?: OpenScenarioTrafficDefinition;
}

export interface OpenScenarioTrafficSwarmAction {
  centralObject: string;
  numberOfVehicles: number;
  innerRadius?: number;
  semiMajorAxis?: number;
  semiMinorAxis?: number;
  trafficDefinition: OpenScenarioTrafficDefinition;
}

export interface OpenScenarioTrafficDefinition {
  vehicleWeightDistribution: OpenScenarioVehicleWeightDistribution;
  velocityDistribution?: OpenScenarioVelocityDistribution;
}

export interface OpenScenarioVehicleWeightDistribution {
  vehicleWeight: OpenScenarioVehicleWeight[];
}

export interface OpenScenarioVehicleWeight {
  weight: number;
  vehicle?: OpenScenarioVehicle;
  catalogReference?: OpenScenarioCatalogReference;
}

export interface OpenScenarioVelocityDistribution {
  range?: OpenScenarioRange;
  deterministic?: OpenScenarioDeterministic;
}

export interface OpenScenarioRange {
  lowerLimit: number;
  upperLimit: number;
}

export interface OpenScenarioDeterministic {
  value: number;
}

export interface OpenScenarioCustomCommandAction {
  type: string;
  content?: string;
}

export interface OpenScenarioRoutingAction {
  assignRouteAction?: OpenScenarioAssignRouteAction;
  followTrajectoryAction?: OpenScenarioFollowTrajectoryAction;
  acquirePositionAction?: OpenScenarioAcquirePositionAction;
}

export interface OpenScenarioAssignRouteAction {
  route: OpenScenarioRoute;
}

export interface OpenScenarioRoute {
  closed: boolean;
  waypoint: OpenScenarioWaypoint[];
}

export interface OpenScenarioWaypoint {
  routeStrategy: 'fastest' | 'shortest' | 'random';
  position: OpenScenarioPosition;
}

export interface OpenScenarioFollowTrajectoryAction {
  trajectory: OpenScenarioTrajectory;
  followingMode: OpenScenarioFollowingMode;
}

export interface OpenScenarioTrajectory {
  name: string;
  closed: boolean;
  parameterDeclarations?: OpenScenarioParameterDeclaration[];
  shape: OpenScenarioShape;
}

export interface OpenScenarioShape {
  polyline?: OpenScenarioPolyline;
  clothoid?: OpenScenarioClothoid;
  nurbs?: OpenScenarioNurbs;
}

export interface OpenScenarioPolyline {
  vertex: OpenScenarioVertex[];
}

export interface OpenScenarioVertex {
  time?: number;
  position: OpenScenarioPosition;
}

export interface OpenScenarioClothoid {
  curvature: number;
  curvatureDot: number;
  length: number;
  startTime?: number;
  stopTime?: number;
  position: OpenScenarioPosition;
}

export interface OpenScenarioNurbs {
  order: number;
  controlPoint: OpenScenarioControlPoint[];
  knot: OpenScenarioKnot[];
}

export interface OpenScenarioControlPoint {
  time?: number;
  weight?: number;
  position: OpenScenarioPosition;
}

export interface OpenScenarioKnot {
  value: number;
}

export interface OpenScenarioFollowingMode {
  followMode: 'position' | 'follow';
}

export interface OpenScenarioAcquirePositionAction {
  position: OpenScenarioPosition;
}

export interface OpenScenarioLongitudinalDistanceAction {
  entityRef: string;
  distance: number;
  freespace?: boolean;
  continuous: boolean;
  displacement?: 'leading' | 'trailing' | 'any';
  dynamicConstraints?: OpenScenarioDynamicConstraints;
}

export interface OpenScenarioDynamicConstraints {
  maxAcceleration?: number;
  maxDeceleration?: number;
  maxSpeed?: number;
}

export interface OpenScenarioLaneOffsetAction {
  continuous: boolean;
  laneOffsetTarget: OpenScenarioLaneOffsetTarget;
  laneOffsetActionDynamics: OpenScenarioTransitionDynamics;
}

export interface OpenScenarioLaneOffsetTarget {
  relativeTargetLaneOffset?: OpenScenarioRelativeTargetLaneOffset;
  absoluteTargetLaneOffset?: OpenScenarioAbsoluteTargetLaneOffset;
}

export interface OpenScenarioRelativeTargetLaneOffset {
  entityRef: string;
  value: number;
}

export interface OpenScenarioAbsoluteTargetLaneOffset {
  value: number;
}

export interface OpenScenarioLateralDistanceAction {
  entityRef: string;
  distance: number;
  freespace?: boolean;
  continuous: boolean;
  displacement?: 'leftToReferencedEntity' | 'rightToReferencedEntity' | 'any';
  dynamicConstraints?: OpenScenarioDynamicConstraints;
}

export interface OpenScenarioRelativeSpeedCondition {
  entityRef: string;
  value: number;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioTraveledDistanceCondition {
  value: number;
}

export interface OpenScenarioRelativeDistanceCondition {
  entityRef: string;
  value: number;
  freespace: boolean;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioTimeToCollisionCondition {
  value: number;
  freespace: boolean;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
  target: OpenScenarioTimeToCollisionConditionTarget;
}

export interface OpenScenarioTimeToCollisionConditionTarget {
  position?: OpenScenarioPosition;
  entityRef?: string;
}

export interface OpenScenarioTimeOfDayCondition {
  dateTime: string;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioUserDefinedValueCondition {
  name: string;
  value: string;
  rule: 'greaterThan' | 'lessThan' | 'equalTo';
}

export interface OpenScenarioTrafficSignalCondition {
  name: string;
  state: string;
}

export interface OpenScenarioTrafficSignalControllerCondition {
  trafficSignalControllerRef: string;
  phase?: string;
}