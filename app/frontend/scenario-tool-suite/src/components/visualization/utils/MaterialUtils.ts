import * as THREE from 'three';

/**
 * Enhanced material utilities for vehicle and scene rendering
 */
export class MaterialUtils {
  private static textureLoader = new THREE.TextureLoader();
  private static materialCache = new Map<string, THREE.Material>();

  /**
   * Create enhanced vehicle material with realistic properties
   */
  static createVehicleMaterial(options: {
    type?: 'car' | 'truck' | 'bus' | 'motorcycle' | 'bicycle';
    color?: THREE.Color | number;
    metalness?: number;
    roughness?: number;
    envMapIntensity?: number;
  } = {}): THREE.MeshStandardMaterial {
    const {
      type = 'car',
      color = 0x4a90e2,
      metalness = 0.8,
      roughness = 0.2,
      envMapIntensity = 1.0
    } = options;

    const cacheKey = `vehicle_${type}_${color}_${metalness}_${roughness}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness,
      roughness,
      envMapIntensity,
      transparent: false,
      side: THREE.FrontSide
    });

    // Add vehicle-specific properties
    switch (type) {
      case 'car':
        material.metalness = 0.9;
        material.roughness = 0.1;
        break;
      case 'truck':
      case 'bus':
        material.metalness = 0.7;
        material.roughness = 0.3;
        break;
      case 'motorcycle':
        material.metalness = 0.95;
        material.roughness = 0.05;
        break;
      case 'bicycle':
        material.metalness = 0.6;
        material.roughness = 0.4;
        break;
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create glass material for vehicle windows
   */
  static createGlassMaterial(options: {
    color?: THREE.Color | number;
    opacity?: number;
    transmission?: number;
    thickness?: number;
  } = {}): THREE.MeshPhysicalMaterial {
    const {
      color = 0x88ccff,
      opacity = 0.1,
      transmission = 0.9,
      thickness = 0.1
    } = options;

    const cacheKey = `glass_${color}_${opacity}_${transmission}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshPhysicalMaterial;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0,
      roughness: 0,
      transmission,
      thickness,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      ior: 1.5 // Index of refraction for glass
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create tire/rubber material
   */
  static createTireMaterial(): THREE.MeshStandardMaterial {
    const cacheKey = 'tire_material';
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.9,
      transparent: false
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create light material for vehicle headlights/taillights
   */
  static createLightMaterial(options: {
    color?: THREE.Color | number;
    intensity?: number;
    emissive?: THREE.Color | number;
  } = {}): THREE.MeshStandardMaterial {
    const {
      color = 0xffffff,
      intensity = 1.0,
      emissive = 0xffffff
    } = options;

    const cacheKey = `light_${color}_${intensity}_${emissive}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(emissive),
      emissiveIntensity: intensity * 0.5,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create road surface material
   */
  static createRoadMaterial(options: {
    color?: THREE.Color | number;
    roughness?: number;
    normalScale?: number;
  } = {}): THREE.MeshStandardMaterial {
    const {
      color = 0x404040,
      roughness = 0.8,
      normalScale = 1.0
    } = options;

    const cacheKey = `road_${color}_${roughness}_${normalScale}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshStandardMaterial;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness,
      transparent: false
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create lane marking material
   */
  static createLaneMarkingMaterial(options: {
    color?: THREE.Color | number;
    opacity?: number;
    dashed?: boolean;
  } = {}): THREE.MeshBasicMaterial {
    const {
      color = 0xffffff,
      opacity = 1.0,
      dashed = false
    } = options;

    const cacheKey = `lane_${color}_${opacity}_${dashed}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshBasicMaterial;
    }

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: opacity < 1.0,
      opacity,
      side: THREE.DoubleSide
    });

    // Add dashed line effect if needed
    if (dashed) {
      // This would require a custom shader for proper dashed lines
      // For now, we'll use a simple approach
      material.transparent = true;
      material.opacity = opacity * 0.8;
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create environment/sky material
   */
  static createSkyMaterial(options: {
    topColor?: THREE.Color | number;
    bottomColor?: THREE.Color | number;
    offset?: number;
    exponent?: number;
  } = {}): THREE.ShaderMaterial {
    const {
      topColor = 0x0077ff,
      bottomColor = 0xffffff,
      offset = 33,
      exponent = 0.6
    } = options;

    const cacheKey = `sky_${topColor}_${bottomColor}_${offset}_${exponent}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.ShaderMaterial;
    }

    const uniforms = {
      topColor: { value: new THREE.Color(topColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      offset: { value: offset },
      exponent: { value: exponent }
    };

    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Create particle material for effects
   */
  static createParticleMaterial(options: {
    color?: THREE.Color | number;
    size?: number;
    opacity?: number;
    blending?: THREE.Blending;
  } = {}): THREE.PointsMaterial {
    const {
      color = 0xffffff,
      size = 1.0,
      opacity = 1.0,
      blending = THREE.AdditiveBlending
    } = options;

    const cacheKey = `particle_${color}_${size}_${opacity}_${blending}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.PointsMaterial;
    }

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size,
      transparent: opacity < 1.0,
      opacity,
      blending,
      vertexColors: false,
      sizeAttenuation: true
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Clear material cache to free memory
   */
  static clearCache(): void {
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { count: number; keys: string[] } {
    return {
      count: this.materialCache.size,
      keys: Array.from(this.materialCache.keys())
    };
  }
}

/**
 * Material configuration presets
 */
export const MaterialPresets = {
  // Vehicle presets
  SPORTS_CAR: {
    type: 'car' as const,
    color: 0xff4444,
    metalness: 0.95,
    roughness: 0.05
  },
  FAMILY_CAR: {
    type: 'car' as const,
    color: 0x4a90e2,
    metalness: 0.8,
    roughness: 0.2
  },
  DELIVERY_TRUCK: {
    type: 'truck' as const,
    color: 0xffffff,
    metalness: 0.6,
    roughness: 0.4
  },
  CITY_BUS: {
    type: 'bus' as const,
    color: 0x2196f3,
    metalness: 0.7,
    roughness: 0.3
  },
  MOTORCYCLE: {
    type: 'motorcycle' as const,
    color: 0x000000,
    metalness: 0.95,
    roughness: 0.05
  },
  BICYCLE: {
    type: 'bicycle' as const,
    color: 0x4caf50,
    metalness: 0.6,
    roughness: 0.4
  },

  // Glass presets
  CLEAR_GLASS: {
    color: 0x88ccff,
    opacity: 0.1,
    transmission: 0.95,
    thickness: 0.1
  },
  TINTED_GLASS: {
    color: 0x333333,
    opacity: 0.3,
    transmission: 0.7,
    thickness: 0.1
  },

  // Light presets
  HEADLIGHT: {
    color: 0xffffff,
    intensity: 1.0,
    emissive: 0xffffff
  },
  TAILLIGHT: {
    color: 0xff0000,
    intensity: 0.8,
    emissive: 0xff0000
  },
  BRAKE_LIGHT: {
    color: 0xff0000,
    intensity: 1.2,
    emissive: 0xff4444
  },
  TURN_SIGNAL: {
    color: 0xffaa00,
    intensity: 1.0,
    emissive: 0xffaa00
  }
};