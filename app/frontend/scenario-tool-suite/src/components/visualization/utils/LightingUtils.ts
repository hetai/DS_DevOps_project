import * as THREE from 'three';

/**
 * Enhanced lighting utilities for realistic scene illumination
 */
export class LightingUtils {
  /**
   * Create a comprehensive lighting setup for the scene
   */
  static createSceneLighting(): {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemisphereLight: THREE.HemisphereLight;
    pointLights: THREE.PointLight[];
  } {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    ambientLight.name = 'ambient-light';

    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.name = 'main-directional-light';

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0001;

    // Hemisphere light for sky/ground color variation
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
    hemisphereLight.position.set(0, 50, 0);
    hemisphereLight.name = 'hemisphere-light';

    // Additional point lights for accent lighting
    const pointLights: THREE.PointLight[] = [
      this.createPointLight({
        color: 0xffffff,
        intensity: 0.5,
        distance: 100,
        position: new THREE.Vector3(25, 25, 25),
        name: 'accent-light-1'
      }),
      this.createPointLight({
        color: 0xffffff,
        intensity: 0.5,
        distance: 100,
        position: new THREE.Vector3(-25, 25, 25),
        name: 'accent-light-2'
      })
    ];

    return {
      ambientLight,
      directionalLight,
      hemisphereLight,
      pointLights
    };
  }

  /**
   * Create a point light with specified parameters
   */
  static createPointLight(options: {
    color?: THREE.ColorRepresentation;
    intensity?: number;
    distance?: number;
    decay?: number;
    position?: THREE.Vector3;
    castShadow?: boolean;
    name?: string;
  }): THREE.PointLight {
    const {
      color = 0xffffff,
      intensity = 1.0,
      distance = 0,
      decay = 2,
      position = new THREE.Vector3(0, 10, 0),
      castShadow = false,
      name = 'point-light'
    } = options;

    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.copy(position);
    light.castShadow = castShadow;
    light.name = name;

    if (castShadow) {
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = distance || 100;
    }

    return light;
  }

  /**
   * Create vehicle headlights
   */
  static createVehicleHeadlights(vehiclePosition: THREE.Vector3, vehicleRotation: THREE.Euler): {
    leftHeadlight: THREE.SpotLight;
    rightHeadlight: THREE.SpotLight;
  } {
    const headlightIntensity = 2.0;
    const headlightDistance = 50;
    const headlightAngle = Math.PI / 6; // 30 degrees
    const headlightPenumbra = 0.1;

    // Calculate headlight positions relative to vehicle
    const frontOffset = 2.0; // Distance from vehicle center to front
    const sideOffset = 0.8; // Distance from center to each headlight
    const heightOffset = 0.5; // Height above ground

    const leftHeadlight = new THREE.SpotLight(
      0xffffff,
      headlightIntensity,
      headlightDistance,
      headlightAngle,
      headlightPenumbra
    );

    const rightHeadlight = new THREE.SpotLight(
      0xffffff,
      headlightIntensity,
      headlightDistance,
      headlightAngle,
      headlightPenumbra
    );

    // Position headlights
    const leftPosition = new THREE.Vector3(
      vehiclePosition.x + Math.cos(vehicleRotation.z) * frontOffset - Math.sin(vehicleRotation.z) * sideOffset,
      vehiclePosition.y + Math.sin(vehicleRotation.z) * frontOffset + Math.cos(vehicleRotation.z) * sideOffset,
      vehiclePosition.z + heightOffset
    );

    const rightPosition = new THREE.Vector3(
      vehiclePosition.x + Math.cos(vehicleRotation.z) * frontOffset + Math.sin(vehicleRotation.z) * sideOffset,
      vehiclePosition.y + Math.sin(vehicleRotation.z) * frontOffset - Math.cos(vehicleRotation.z) * sideOffset,
      vehiclePosition.z + heightOffset
    );

    leftHeadlight.position.copy(leftPosition);
    rightHeadlight.position.copy(rightPosition);

    // Set target positions (forward direction)
    const targetDistance = 10;
    const leftTarget = leftPosition.clone().add(
      new THREE.Vector3(
        Math.cos(vehicleRotation.z) * targetDistance,
        Math.sin(vehicleRotation.z) * targetDistance,
        0
      )
    );
    const rightTarget = rightPosition.clone().add(
      new THREE.Vector3(
        Math.cos(vehicleRotation.z) * targetDistance,
        Math.sin(vehicleRotation.z) * targetDistance,
        0
      )
    );

    leftHeadlight.target.position.copy(leftTarget);
    rightHeadlight.target.position.copy(rightTarget);

    leftHeadlight.castShadow = true;
    rightHeadlight.castShadow = true;

    leftHeadlight.name = 'vehicle-headlight-left';
    rightHeadlight.name = 'vehicle-headlight-right';

    return { leftHeadlight, rightHeadlight };
  }

  /**
   * Create street lighting for road scenes
   */
  static createStreetLighting(roadPoints: THREE.Vector3[], spacing: number = 20): THREE.PointLight[] {
    const streetLights: THREE.PointLight[] = [];
    const lightHeight = 8;
    const lightIntensity = 1.5;
    const lightDistance = 25;
    const lightColor = 0xffa500; // Warm orange street light color

    for (let i = 0; i < roadPoints.length; i += Math.floor(spacing)) {
      const point = roadPoints[i];
      
      // Create lights on both sides of the road
      const leftLight = this.createPointLight({
        color: lightColor,
        intensity: lightIntensity,
        distance: lightDistance,
        position: new THREE.Vector3(
          point.x - 5, // Offset to the left
          point.y,
          point.z + lightHeight
        ),
        castShadow: true,
        name: `street-light-left-${i}`
      });

      const rightLight = this.createPointLight({
        color: lightColor,
        intensity: lightIntensity,
        distance: lightDistance,
        position: new THREE.Vector3(
          point.x + 5, // Offset to the right
          point.y,
          point.z + lightHeight
        ),
        castShadow: true,
        name: `street-light-right-${i}`
      });

      streetLights.push(leftLight, rightLight);
    }

    return streetLights;
  }

  /**
   * Create dynamic lighting that follows the camera
   */
  static createCameraLight(camera: THREE.Camera): THREE.DirectionalLight {
    const cameraLight = new THREE.DirectionalLight(0xffffff, 0.5);
    cameraLight.position.set(0, 0, 10);
    cameraLight.name = 'camera-light';
    
    // Attach to camera
    camera.add(cameraLight);
    
    return cameraLight;
  }

  /**
   * Create environment lighting with time-of-day simulation
   */
  static createTimeOfDayLighting(timeOfDay: 'dawn' | 'day' | 'dusk' | 'night'): {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    hemisphereLight: THREE.HemisphereLight;
    fogColor: THREE.Color;
    fogNear: number;
    fogFar: number;
  } {
    let ambientIntensity: number;
    let directionalIntensity: number;
    let directionalColor: THREE.ColorRepresentation;
    let skyColor: THREE.ColorRepresentation;
    let groundColor: THREE.ColorRepresentation;
    let hemisphereIntensity: number;
    let fogColor: THREE.Color;
    let fogNear: number;
    let fogFar: number;
    let sunPosition: THREE.Vector3;

    switch (timeOfDay) {
      case 'dawn':
        ambientIntensity = 0.2;
        directionalIntensity = 0.6;
        directionalColor = 0xffa500;
        skyColor = 0xff7f50;
        groundColor = 0x8b4513;
        hemisphereIntensity = 0.4;
        fogColor = new THREE.Color(0xffa500);
        fogNear = 10;
        fogFar = 200;
        sunPosition = new THREE.Vector3(100, 20, 50);
        break;

      case 'day':
        ambientIntensity = 0.4;
        directionalIntensity = 1.0;
        directionalColor = 0xffffff;
        skyColor = 0x87ceeb;
        groundColor = 0x8b7355;
        hemisphereIntensity = 0.6;
        fogColor = new THREE.Color(0xcccccc);
        fogNear = 50;
        fogFar = 500;
        sunPosition = new THREE.Vector3(50, 100, 50);
        break;

      case 'dusk':
        ambientIntensity = 0.3;
        directionalIntensity = 0.7;
        directionalColor = 0xff6347;
        skyColor = 0x4169e1;
        groundColor = 0x2f4f4f;
        hemisphereIntensity = 0.5;
        fogColor = new THREE.Color(0xff6347);
        fogNear = 20;
        fogFar = 300;
        sunPosition = new THREE.Vector3(100, 30, 50);
        break;

      case 'night':
        ambientIntensity = 0.1;
        directionalIntensity = 0.2;
        directionalColor = 0x4169e1;
        skyColor = 0x191970;
        groundColor = 0x2f2f2f;
        hemisphereIntensity = 0.3;
        fogColor = new THREE.Color(0x191970);
        fogNear = 5;
        fogFar = 100;
        sunPosition = new THREE.Vector3(-50, -20, 50);
        break;

      default:
        return this.createTimeOfDayLighting('day');
    }

    const ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity);
    ambientLight.name = `ambient-light-${timeOfDay}`;

    const directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
    directionalLight.position.copy(sunPosition);
    directionalLight.castShadow = true;
    directionalLight.name = `directional-light-${timeOfDay}`;

    // Configure shadows
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, hemisphereIntensity);
    hemisphereLight.name = `hemisphere-light-${timeOfDay}`;

    return {
      ambientLight,
      directionalLight,
      hemisphereLight,
      fogColor,
      fogNear,
      fogFar
    };
  }

  /**
   * Create particle effects for environmental atmosphere
   */
  static createAtmosphericParticles(particleCount: number = 1000): {
    particles: THREE.Points;
    updateParticles: (deltaTime: number) => void;
  } {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Initialize particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a large area
      positions[i3] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = (Math.random() - 0.5) * 200;
      positions[i3 + 2] = Math.random() * 50;
      
      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 2] = Math.random() * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'atmospheric-particles';

    const updateParticles = (deltaTime: number) => {
      const positions = geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Update positions based on velocities
        positions[i3] += velocities[i3] * deltaTime;
        positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
        positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
        
        // Reset particles that go out of bounds
        if (positions[i3] > 100) positions[i3] = -100;
        if (positions[i3] < -100) positions[i3] = 100;
        if (positions[i3 + 1] > 100) positions[i3 + 1] = -100;
        if (positions[i3 + 1] < -100) positions[i3 + 1] = 100;
        if (positions[i3 + 2] > 50) positions[i3 + 2] = 0;
      }
      
      geometry.attributes.position.needsUpdate = true;
    };

    return { particles, updateParticles };
  }

  /**
   * Dispose of lighting resources
   */
  static disposeLighting(lights: THREE.Light[]): void {
    lights.forEach(light => {
      if (light.shadow && light.shadow.map) {
        light.shadow.map.dispose();
      }
      light.dispose();
    });
  }
}

/**
 * Lighting configuration presets
 */
export const LightingPresets = {
  DEFAULT: {
    ambientIntensity: 0.3,
    directionalIntensity: 1.0,
    hemisphereIntensity: 0.6,
    enableShadows: true
  },
  BRIGHT: {
    ambientIntensity: 0.5,
    directionalIntensity: 1.2,
    hemisphereIntensity: 0.8,
    enableShadows: true
  },
  DRAMATIC: {
    ambientIntensity: 0.1,
    directionalIntensity: 1.5,
    hemisphereIntensity: 0.4,
    enableShadows: true
  },
  SOFT: {
    ambientIntensity: 0.6,
    directionalIntensity: 0.8,
    hemisphereIntensity: 0.9,
    enableShadows: false
  }
};