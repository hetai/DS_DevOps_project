/**
 * Enhanced Orbit Camera Controller
 * Ported and adapted from Dash.js OrbitControls.js
 * Provides smooth orbit, zoom, and pan controls for 3D visualization
 */

import * as THREE from 'three';

export interface OrbitControlsConfig {
  enabled?: boolean;
  target?: THREE.Vector3;
  minDistance?: number;
  maxDistance?: number;
  minZoom?: number;
  maxZoom?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  zoomSpeed?: number;
  enableRotate?: boolean;
  rotateSpeed?: number;
  enablePan?: boolean;
  keyPanSpeed?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableKeys?: boolean;
}

export interface MouseButtons {
  ORBIT: number;
  ZOOM: number;
  PAN: number;
}

export interface KeyCodes {
  LEFT: number;
  UP: number;
  RIGHT: number;
  BOTTOM: number;
}

enum ControlState {
  NONE = -1,
  ROTATE = 0,
  DOLLY = 1,
  PAN = 2,
  TOUCH_ROTATE = 3,
  TOUCH_PAN = 4,
  TOUCH_DOLLY_PAN = 5,
  TOUCH_DOLLY_ROTATE = 6
}

export class OrbitCameraController {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private config: Required<OrbitControlsConfig>;
  
  // State
  private state: ControlState = ControlState.NONE;
  private target: THREE.Vector3;
  private target0: THREE.Vector3;
  private position0: THREE.Vector3;
  private zoom0: number;
  
  // Internal state
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private scale = 1;
  private panOffset = new THREE.Vector3();
  private zoomChanged = false;
  
  // Mouse state
  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();
  private rotateDelta = new THREE.Vector2();
  private panStart = new THREE.Vector2();
  private panEnd = new THREE.Vector2();
  private panDelta = new THREE.Vector2();
  private dollyStart = new THREE.Vector2();
  private dollyEnd = new THREE.Vector2();
  private dollyDelta = new THREE.Vector2();
  
  // Event listeners
  private onMouseDown = this.handleMouseDown.bind(this);
  private onMouseMove = this.handleMouseMove.bind(this);
  private onMouseUp = this.handleMouseUp.bind(this);
  private onMouseWheel = this.handleMouseWheel.bind(this);
  private onKeyDown = this.handleKeyDown.bind(this);
  private onTouchStart = this.handleTouchStart.bind(this);
  private onTouchMove = this.handleTouchMove.bind(this);
  private onTouchEnd = this.handleTouchEnd.bind(this);
  private onContextMenu = this.handleContextMenu.bind(this);
  
  // Default configuration
  private static readonly DEFAULT_CONFIG: Required<OrbitControlsConfig> = {
    enabled: true,
    target: new THREE.Vector3(),
    minDistance: 0,
    maxDistance: Infinity,
    minZoom: 0,
    maxZoom: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    enableDamping: false,
    dampingFactor: 0.25,
    enableZoom: true,
    zoomSpeed: 1.0,
    enableRotate: true,
    rotateSpeed: 1.0,
    enablePan: true,
    keyPanSpeed: 7.0,
    autoRotate: false,
    autoRotateSpeed: 2.0,
    enableKeys: true
  };
  
  private static readonly MOUSE_BUTTONS: MouseButtons = {
    ORBIT: 0, // LEFT
    ZOOM: 1,  // MIDDLE
    PAN: 2    // RIGHT
  };
  
  private static readonly KEYS: KeyCodes = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40
  };
  
  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    config: Partial<OrbitControlsConfig> = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = { ...OrbitCameraController.DEFAULT_CONFIG, ...config };
    
    this.target = this.config.target.clone();
    this.target0 = this.target.clone();
    this.position0 = this.camera.position.clone();
    this.zoom0 = this.camera instanceof THREE.OrthographicCamera ? this.camera.zoom : 1;
    
    this.addEventListeners();
  }
  
  public dispose(): void {
    this.removeEventListeners();
  }
  
  public update(): boolean {
    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      this.camera.up,
      new THREE.Vector3(0, 1, 0)
    );
    const quatInverse = quat.clone().invert();
    
    const lastPosition = new THREE.Vector3();
    const lastQuaternion = new THREE.Quaternion();
    
    const position = this.camera.position;
    
    offset.copy(position).sub(this.target);
    offset.applyQuaternion(quat);
    
    this.spherical.setFromVector3(offset);
    
    if (this.config.autoRotate && this.state === ControlState.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }
    
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    
    // Restrict theta to be between desired limits
    this.spherical.theta = Math.max(
      this.config.minAzimuthAngle,
      Math.min(this.config.maxAzimuthAngle, this.spherical.theta)
    );
    
    // Restrict phi to be between desired limits
    this.spherical.phi = Math.max(
      this.config.minPolarAngle,
      Math.min(this.config.maxPolarAngle, this.spherical.phi)
    );
    
    this.spherical.makeSafe();
    this.spherical.radius *= this.scale;
    
    // Restrict radius to be between desired limits
    this.spherical.radius = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, this.spherical.radius)
    );
    
    // Move target to panned location
    this.target.add(this.panOffset);
    
    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);
    
    position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
    
    if (this.config.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.config.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.config.dampingFactor);
      this.panOffset.multiplyScalar(1 - this.config.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }
    
    this.scale = 1;
    
    // Update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    if (this.zoomChanged ||
        lastPosition.distanceToSquared(this.camera.position) > 1e-6 ||
        8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > 1e-6) {
      
      lastPosition.copy(this.camera.position);
      lastQuaternion.copy(this.camera.quaternion);
      this.zoomChanged = false;
      
      return true;
    }
    
    return false;
  }
  
  public getPolarAngle(): number {
    return this.spherical.phi;
  }
  
  public getAzimuthalAngle(): number {
    return this.spherical.theta;
  }
  
  public saveState(): void {
    this.target0.copy(this.target);
    this.position0.copy(this.camera.position);
    this.zoom0 = this.camera instanceof THREE.OrthographicCamera ? this.camera.zoom : 1;
  }
  
  public reset(): void {
    this.target.copy(this.target0);
    this.camera.position.copy(this.position0);
    
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.zoom = this.zoom0;
      this.camera.updateProjectionMatrix();
    }
    
    this.state = ControlState.NONE;
    this.update();
  }
  
  public rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }
  
  public rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }
  
  public panLeft(distance: number, objectMatrix: THREE.Matrix4): void {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }
  
  public panUp(distance: number, objectMatrix: THREE.Matrix4): void {
    const v = new THREE.Vector3();
    if (this.config.enableKeys) {
      v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
    } else {
      v.setFromMatrixColumn(objectMatrix, 0);
      v.crossVectors(this.camera.up, v);
    }
    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }
  
  public pan(deltaX: number, deltaY: number): void {
    const element = this.domElement;
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      // perspective
      const position = this.camera.position;
      const offset = position.clone().sub(this.target);
      let targetDistance = offset.length();
      
      // half of the fov is center to top of screen
      targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);
      
      // we use only clientHeight here so aspect ratio does not distort speed
      this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.camera.matrix);
      this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.camera.matrix);
      
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      // orthographic
      this.panLeft(
        deltaX * (this.camera.right - this.camera.left) / this.camera.zoom / element.clientWidth,
        this.camera.matrix
      );
      this.panUp(
        deltaY * (this.camera.top - this.camera.bottom) / this.camera.zoom / element.clientHeight,
        this.camera.matrix
      );
    }
  }
  
  public dollyIn(dollyScale: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.scale /= dollyScale;
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.zoom = Math.max(
        this.config.minZoom,
        Math.min(this.config.maxZoom, this.camera.zoom * dollyScale)
      );
      this.camera.updateProjectionMatrix();
      this.zoomChanged = true;
    }
  }
  
  public dollyOut(dollyScale: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.scale *= dollyScale;
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.zoom = Math.max(
        this.config.minZoom,
        Math.min(this.config.maxZoom, this.camera.zoom / dollyScale)
      );
      this.camera.updateProjectionMatrix();
      this.zoomChanged = true;
    }
  }
  
  private getAutoRotationAngle(): number {
    return 2 * Math.PI / 60 / 60 * this.config.autoRotateSpeed;
  }
  
  private getZoomScale(): number {
    return Math.pow(0.95, this.config.zoomSpeed);
  }
  
  private addEventListeners(): void {
    this.domElement.addEventListener('contextmenu', this.onContextMenu, false);
    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('wheel', this.onMouseWheel, false);
    this.domElement.addEventListener('touchstart', this.onTouchStart, false);
    this.domElement.addEventListener('touchend', this.onTouchEnd, false);
    this.domElement.addEventListener('touchmove', this.onTouchMove, false);
    
    if (this.config.enableKeys) {
      window.addEventListener('keydown', this.onKeyDown, false);
    }
  }
  
  private removeEventListeners(): void {
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    
    if (this.config.enableKeys) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
  }
  
  private handleMouseDown(event: MouseEvent): void {
    if (!this.config.enabled) return;
    
    event.preventDefault();
    
    switch (event.button) {
      case OrbitCameraController.MOUSE_BUTTONS.ORBIT:
        if (!this.config.enableRotate) return;
        this.handleMouseDownRotate(event);
        this.state = ControlState.ROTATE;
        break;
        
      case OrbitCameraController.MOUSE_BUTTONS.ZOOM:
        if (!this.config.enableZoom) return;
        this.handleMouseDownDolly(event);
        this.state = ControlState.DOLLY;
        break;
        
      case OrbitCameraController.MOUSE_BUTTONS.PAN:
        if (!this.config.enablePan) return;
        this.handleMouseDownPan(event);
        this.state = ControlState.PAN;
        break;
    }
    
    if (this.state !== ControlState.NONE) {
      document.addEventListener('mousemove', this.onMouseMove, false);
      document.addEventListener('mouseup', this.onMouseUp, false);
    }
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (!this.config.enabled) return;
    
    event.preventDefault();
    
    switch (this.state) {
      case ControlState.ROTATE:
        if (!this.config.enableRotate) return;
        this.handleMouseMoveRotate(event);
        break;
        
      case ControlState.DOLLY:
        if (!this.config.enableZoom) return;
        this.handleMouseMoveDolly(event);
        break;
        
      case ControlState.PAN:
        if (!this.config.enablePan) return;
        this.handleMouseMovePan(event);
        break;
    }
  }
  
  private handleMouseUp(): void {
    if (!this.config.enabled) return;
    
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    
    this.state = ControlState.NONE;
  }
  
  private handleMouseWheel(event: WheelEvent): void {
    if (!this.config.enabled || !this.config.enableZoom) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    this.handleMouseWheelDolly(event);
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.config.enabled || !this.config.enableKeys || !this.config.enablePan) return;
    
    switch (event.keyCode) {
      case OrbitCameraController.KEYS.UP:
        this.pan(0, this.config.keyPanSpeed);
        break;
        
      case OrbitCameraController.KEYS.BOTTOM:
        this.pan(0, -this.config.keyPanSpeed);
        break;
        
      case OrbitCameraController.KEYS.LEFT:
        this.pan(this.config.keyPanSpeed, 0);
        break;
        
      case OrbitCameraController.KEYS.RIGHT:
        this.pan(-this.config.keyPanSpeed, 0);
        break;
    }
  }
  
  private handleTouchStart(event: TouchEvent): void {
    if (!this.config.enabled) return;
    
    event.preventDefault();
    
    switch (event.touches.length) {
      case 1: // one-fingered touch: rotate
        if (!this.config.enableRotate) return;
        this.handleTouchStartRotate(event);
        this.state = ControlState.TOUCH_ROTATE;
        break;
        
      case 2: // two-fingered touch: dolly-pan
        if (!this.config.enableZoom && !this.config.enablePan) return;
        this.handleTouchStartDollyPan(event);
        this.state = ControlState.TOUCH_DOLLY_PAN;
        break;
        
      default:
        this.state = ControlState.NONE;
    }
  }
  
  private handleTouchMove(event: TouchEvent): void {
    if (!this.config.enabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    switch (this.state) {
      case ControlState.TOUCH_ROTATE:
        if (!this.config.enableRotate) return;
        this.handleTouchMoveRotate(event);
        break;
        
      case ControlState.TOUCH_DOLLY_PAN:
        if (!this.config.enableZoom && !this.config.enablePan) return;
        this.handleTouchMoveDollyPan(event);
        break;
        
      default:
        this.state = ControlState.NONE;
    }
  }
  
  private handleTouchEnd(): void {
    if (!this.config.enabled) return;
    this.state = ControlState.NONE;
  }
  
  private handleContextMenu(event: Event): void {
    if (!this.config.enabled) return;
    event.preventDefault();
  }
  
  // Mouse event handlers
  private handleMouseDownRotate(event: MouseEvent): void {
    this.rotateStart.set(event.clientX, event.clientY);
  }
  
  private handleMouseDownDolly(event: MouseEvent): void {
    this.dollyStart.set(event.clientX, event.clientY);
  }
  
  private handleMouseDownPan(event: MouseEvent): void {
    this.panStart.set(event.clientX, event.clientY);
  }
  
  private handleMouseMoveRotate(event: MouseEvent): void {
    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.config.rotateSpeed);
    
    const element = this.domElement;
    
    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
    this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
    
    this.rotateStart.copy(this.rotateEnd);
  }
  
  private handleMouseMoveDolly(event: MouseEvent): void {
    this.dollyEnd.set(event.clientX, event.clientY);
    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
    
    if (this.dollyDelta.y > 0) {
      this.dollyIn(this.getZoomScale());
    } else if (this.dollyDelta.y < 0) {
      this.dollyOut(this.getZoomScale());
    }
    
    this.dollyStart.copy(this.dollyEnd);
  }
  
  private handleMouseMovePan(event: MouseEvent): void {
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.config.rotateSpeed);
    
    this.pan(this.panDelta.x, this.panDelta.y);
    
    this.panStart.copy(this.panEnd);
  }
  
  private handleMouseWheelDolly(event: WheelEvent): void {
    if (event.deltaY < 0) {
      this.dollyOut(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyIn(this.getZoomScale());
    }
  }
  
  // Touch event handlers
  private handleTouchStartRotate(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
    } else {
      const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      this.rotateStart.set(x, y);
    }
  }
  
  private handleTouchStartDollyPan(event: TouchEvent): void {
    if (this.config.enableZoom) {
      const dx = event.touches[0].pageX - event.touches[1].pageX;
      const dy = event.touches[0].pageY - event.touches[1].pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      this.dollyStart.set(0, distance);
    }
    
    if (this.config.enablePan) {
      const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      this.panStart.set(x, y);
    }
  }
  
  private handleTouchMoveRotate(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    } else {
      const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      this.rotateEnd.set(x, y);
    }
    
    this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.config.rotateSpeed);
    
    const element = this.domElement;
    
    this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight);
    this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);
    
    this.rotateStart.copy(this.rotateEnd);
  }
  
  private handleTouchMoveDollyPan(event: TouchEvent): void {
    if (this.config.enableZoom) {
      const dx = event.touches[0].pageX - event.touches[1].pageX;
      const dy = event.touches[0].pageY - event.touches[1].pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      this.dollyEnd.set(0, distance);
      this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.config.zoomSpeed));
      
      this.dollyIn(this.dollyDelta.y);
      this.dollyStart.copy(this.dollyEnd);
    }
    
    if (this.config.enablePan) {
      const x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      const y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      
      this.panEnd.set(x, y);
      this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.config.rotateSpeed);
      
      this.pan(this.panDelta.x, this.panDelta.y);
      this.panStart.copy(this.panEnd);
    }
  }
}