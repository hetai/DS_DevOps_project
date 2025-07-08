/**
 * Scene Manager - Core Three.js scene orchestration
 * Inspired by Dash self-driving car simulator architecture
 */

import * as THREE from 'three';
import { SceneState, CameraState, RenderOptions, PerformanceMetrics, SceneObject } from '../types/VisualizationTypes';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: any; // OrbitControls
  private container: HTMLElement | null = null;
  
  private sceneObjects: Map<string, SceneObject> = new Map();
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  
  private state: SceneState = {
    isLoading: false,
    error: null,
    isInitialized: false,
    showValidationHighlights: true,
    timelinePosition: 0,
    timelineMax: 100,
    playbackSpeed: 1.0,
    isPlaying: false,
  };
  
  private cameraState: CameraState = {
    position: new THREE.Vector3(0, 10, 20),
    target: new THREE.Vector3(0, 0, 0),
    zoom: 1,
    autoRotate: false,
    controlsEnabled: true,
  };
  
  private renderOptions: RenderOptions = {
    showRoadNetwork: true,
    showVehicles: true,
    showTrajectories: true,
    showValidationIssues: true,
    quality: 'high',
    enableAntialiasing: true,
    enableShadows: true,
  };
  
  private performanceMetrics: PerformanceMetrics = {
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    triangleCount: 0,
    drawCalls: 0,
  };
  
  private onStateChange?: (state: SceneState) => void;
  private onError?: (error: string) => void;
  
  constructor(onStateChange?: (state: SceneState) => void, onError?: (error: string) => void) {
    this.onStateChange = onStateChange;
    this.onError = onError;
    
    // Initialize Three.js components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: this.renderOptions.enableAntialiasing,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.setupScene();
  }
  
  private setupScene(): void {
    // Scene setup
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
    
    // Lighting setup inspired by Dash
    this.setupLighting();
    
    // Renderer setup
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = this.renderOptions.enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    
    // Camera setup
    this.camera.position.copy(this.cameraState.position);
    this.camera.lookAt(this.cameraState.target);
    
    this.updateState({ isInitialized: true });
  }
  
  private setupLighting(): void {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // Directional light (sun) with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
    
    // Hemisphere light for natural sky lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  public async initialize(container: HTMLElement): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });
      
      this.container = container;
      
      // Set renderer size
      const rect = container.getBoundingClientRect();
      this.renderer.setSize(rect.width, rect.height);
      this.camera.aspect = rect.width / rect.height;
      this.camera.updateProjectionMatrix();
      
      // Add renderer to DOM
      container.appendChild(this.renderer.domElement);
      
      // Setup controls (imported dynamically to avoid SSR issues)
      await this.setupControls();
      
      // Setup resize handling
      this.setupResizeHandler();
      
      // Start render loop
      this.startRenderLoop();
      
      this.updateState({ isLoading: false, isInitialized: true });
      
    } catch (error: any) {
      const errorMessage = `Failed to initialize 3D scene: ${error.message}`;
      this.updateState({ isLoading: false, error: errorMessage });
      this.onError?.(errorMessage);
      throw error;
    }
  }
  
  private async setupControls(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 1000;
      this.controls.maxPolarAngle = Math.PI / 2;
      this.controls.autoRotate = this.cameraState.autoRotate;
      this.controls.enabled = this.cameraState.controlsEnabled;
      
      // Update camera state on control changes
      this.controls.addEventListener('change', () => {
        this.cameraState.position.copy(this.camera.position);
        this.cameraState.target.copy(this.controls.target);
      });
      
    } catch (error: any) {
      console.warn('Failed to setup controls:', error);
      // Continue without controls
    }
  }
  
  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(width, height);
      }
    });
    
    if (this.container) {
      resizeObserver.observe(this.container);
    }
  }
  
  private handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  private startRenderLoop(): void {
    const animate = () => {
      try {
        this.animationFrameId = requestAnimationFrame(animate);
        
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        this.render();
        
        this.updatePerformanceMetrics();
        
      } catch (error: any) {
        console.error('Render loop error:', error);
        this.updateState({ error: `Render error: ${error.message}` });
      }
    };
    
    animate();
  }
  
  private update(deltaTime: number): void {
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Update timeline if playing
    if (this.state.isPlaying) {
      const newPosition = this.state.timelinePosition + (deltaTime * this.state.playbackSpeed * 10);
      this.updateTimelinePosition(Math.min(newPosition, this.state.timelineMax));
    }
    
    // Update animated objects
    this.updateAnimatedObjects(deltaTime);
  }
  
  private updateAnimatedObjects(deltaTime: number): void {
    for (const [id, sceneObject] of this.sceneObjects) {
      if (sceneObject.animated && sceneObject.visible) {
        // Update object animations based on timeline position
        this.updateObjectAnimation(sceneObject, deltaTime);
      }
    }
  }
  
  private updateObjectAnimation(sceneObject: SceneObject, deltaTime: number): void {
    // Implement object-specific animation logic
    switch (sceneObject.type) {
      case 'vehicle':
        this.updateVehicleAnimation(sceneObject, deltaTime);
        break;
      case 'event':
        this.updateEventAnimation(sceneObject, deltaTime);
        break;
    }
  }
  
  private updateVehicleAnimation(sceneObject: SceneObject, deltaTime: number): void {
    // Vehicle animation based on timeline position
    if (sceneObject.metadata?.trajectory) {
      const progress = this.state.timelinePosition / this.state.timelineMax;
      const trajectory = sceneObject.metadata.trajectory;
      const index = Math.floor(progress * (trajectory.length - 1));
      
      if (trajectory[index]) {
        sceneObject.mesh.position.copy(trajectory[index]);
      }
    }
  }
  
  private updateEventAnimation(sceneObject: SceneObject, deltaTime: number): void {
    // Event animation (e.g., blinking validation issues)
    if (sceneObject.metadata?.validationIssue) {
      const time = this.clock.getElapsedTime();
      const opacity = Math.sin(time * 4) * 0.5 + 0.5;
      
      if (sceneObject.mesh.material instanceof THREE.Material) {
        sceneObject.mesh.material.opacity = opacity;
      }
    }
  }
  
  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
  
  private updatePerformanceMetrics(): void {
    // Update FPS (simplified)
    this.performanceMetrics.fps = Math.round(1 / this.clock.getDelta());
    this.performanceMetrics.triangleCount = this.renderer.info.render.triangles;
    this.performanceMetrics.drawCalls = this.renderer.info.render.calls;
    
    // Memory usage (if available)
    if ((performance as any).memory) {
      this.performanceMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
  }
  
  // Public API
  public addObject(object: SceneObject): void {
    this.sceneObjects.set(object.id, object);
    this.scene.add(object.mesh);
  }
  
  public removeObject(id: string): void {
    const object = this.sceneObjects.get(id);
    if (object) {
      this.scene.remove(object.mesh);
      this.sceneObjects.delete(id);
      
      // Dispose geometry and materials
      if (object.mesh.geometry) {
        object.mesh.geometry.dispose();
      }
      if (object.mesh.material) {
        if (Array.isArray(object.mesh.material)) {
          object.mesh.material.forEach(material => material.dispose());
        } else {
          object.mesh.material.dispose();
        }
      }
    }
  }
  
  public updateObject(id: string, updates: Partial<SceneObject>): void {
    const object = this.sceneObjects.get(id);
    if (object) {
      Object.assign(object, updates);
      object.mesh.visible = object.visible;
    }
  }
  
  public clearScene(): void {
    for (const [id] of this.sceneObjects) {
      this.removeObject(id);
    }
  }
  
  public updateTimelinePosition(position: number): void {
    this.updateState({ timelinePosition: position });
  }
  
  public setPlaybackSpeed(speed: number): void {
    this.updateState({ playbackSpeed: speed });
  }
  
  public play(): void {
    this.updateState({ isPlaying: true });
  }
  
  public pause(): void {
    this.updateState({ isPlaying: false });
  }
  
  public resetCamera(): void {
    this.camera.position.copy(this.cameraState.position);
    this.camera.lookAt(this.cameraState.target);
    
    if (this.controls) {
      this.controls.target.copy(this.cameraState.target);
      this.controls.update();
    }
  }
  
  public updateRenderOptions(options: Partial<RenderOptions>): void {
    Object.assign(this.renderOptions, options);
    
    // Apply render option changes
    if (options.enableShadows !== undefined) {
      this.renderer.shadowMap.enabled = options.enableShadows;
    }
    
    // Update object visibility based on options
    for (const [id, object] of this.sceneObjects) {
      this.updateObjectVisibility(object);
    }
  }
  
  private updateObjectVisibility(object: SceneObject): void {
    let visible = object.visible;
    
    switch (object.type) {
      case 'road':
        visible = visible && this.renderOptions.showRoadNetwork;
        break;
      case 'vehicle':
        visible = visible && this.renderOptions.showVehicles;
        break;
      case 'validation':
        visible = visible && this.renderOptions.showValidationIssues;
        break;
    }
    
    object.mesh.visible = visible;
  }
  
  public getState(): SceneState {
    return { ...this.state };
  }
  
  public getCameraState(): CameraState {
    return { ...this.cameraState };
  }
  
  public getRenderOptions(): RenderOptions {
    return { ...this.renderOptions };
  }
  
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  private updateState(updates: Partial<SceneState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
  }
  
  public dispose(): void {
    // Stop render loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear scene
    this.clearScene();
    
    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
    }
    
    // Dispose renderer
    this.renderer.dispose();
    
    // Remove from DOM
    if (this.container && this.renderer.domElement.parentNode) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    this.updateState({ isInitialized: false });
  }
  
  // Debug helpers
  public addDebugHelpers(): void {
    // Grid helper
    const gridHelper = new THREE.GridHelper(200, 50);
    this.scene.add(gridHelper);
    
    // Axes helper
    const axesHelper = new THREE.AxesHelper(50);
    this.scene.add(axesHelper);
    
    // Camera helper for directional light
    const directionalLight = this.scene.children.find(
      child => child instanceof THREE.DirectionalLight
    ) as THREE.DirectionalLight;
    
    if (directionalLight) {
      const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
      this.scene.add(cameraHelper);
    }
  }
  
  public logPerformanceMetrics(): void {
    console.log('Performance Metrics:', this.performanceMetrics);
  }
}