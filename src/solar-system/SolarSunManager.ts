// SolarSunManager.ts - Sun rendering and management for multi-scale solar system

import * as THREE from 'three';
import { ScaleContext } from './types/ScaleContext';
import type { ScaleContextConfig } from './types/ScaleContext';
import { computeSolarEphemeris, computeSunDirectionGlobe } from './SolarEphemerisService';
import { EarthOrientationService } from './EarthOrientationService';

export interface SunConfig {
  baseRadius: number;          // Base sun radius in units
  coronaIntensity: number;     // Corona glow intensity
  lightIntensity: number;      // Directional light intensity
  lightColor: number;          // Light color (hex)
  enableCorona: boolean;       // Show corona effect
  enableLighting: boolean;     // Affect scene lighting
}

export interface SunState {
  isVisible: boolean;
  currentRadius: number;
  currentPosition: THREE.Vector3;
  currentScale: ScaleContext;
  lightIntensity: number;
  subsolarLatitudeDeg?: number;
  subsolarLongitudeDeg?: number;
  adjustedSubsolarLongitudeDeg?: number;
}

export type SunStateChangeCallback = (state: SunState) => void;

export class SolarSunManager {
  private static readonly EARTH_SUN_RADIUS_RATIO = 109.2;
  private static readonly EARTH_SUN_DISTANCE_RATIO = 23455;
  private scene: THREE.Scene;
  private config: SunConfig;
  private sunMesh: THREE.Mesh | null = null;
  private coronaMesh: THREE.Mesh | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private currentState: SunState;
  private stateChangeCallback: SunStateChangeCallback | null = null;
  private disposed: boolean = false;
  private readonly earthOrientation = new EarthOrientationService();
  private nowProvider: () => Date = () => new Date();

  // Scale-specific configurations
  private scaleConfigs: Map<ScaleContext, ScaleContextConfig> = new Map();

  constructor(scene: THREE.Scene, config: Partial<SunConfig> = {}) {
    this.scene = scene;
    this.config = {
      baseRadius: 100,
      coronaIntensity: 0.5,
      lightIntensity: 1.0,
      lightColor: 0xffffff,
      enableCorona: true,
      enableLighting: true,
      ...config
    };

    this.currentState = {
      isVisible: false,
      currentRadius: this.config.baseRadius,
      currentPosition: new THREE.Vector3(0, 0, 0),
      currentScale: ScaleContext.EARTH_LOCAL,
      lightIntensity: this.config.lightIntensity
    };

    this.initializeScaleConfigs();
    this.createSun();
  }

  private initializeScaleConfigs(): void {
    const createCompressedScaleConfig = (
      context: ScaleContext,
      cameraRange: { min: number; max: number },
      earthRadius: number,
      sunVisible: boolean,
      lightIntensity: number,
      compression: number
    ): ScaleContextConfig => {
      if (!sunVisible) {
        return {
          context,
          cameraRange,
          earthRadius,
          sunRadius: 0,
          sunDistance: 0,
          sunVisible,
          lightIntensity
        };
      }

      const sunRadius = earthRadius * SolarSunManager.EARTH_SUN_RADIUS_RATIO * compression;
      const sunDistance = earthRadius * SolarSunManager.EARTH_SUN_DISTANCE_RATIO * compression;

      return {
        context,
        cameraRange,
        earthRadius,
        sunRadius,
        sunDistance,
        sunVisible,
        lightIntensity
      };
    };

    // EARTH_LOCAL: Sun not visible
    this.scaleConfigs.set(
      ScaleContext.EARTH_LOCAL,
      createCompressedScaleConfig(
        ScaleContext.EARTH_LOCAL,
        { min: 150, max: 1000 },
        100,
        false,
        0.3,
        0
      )
    );

    // EARTH_SPACE: Ratio-preserving compressed sun placement for Earth-centric operations
    this.scaleConfigs.set(
      ScaleContext.EARTH_SPACE,
      createCompressedScaleConfig(
        ScaleContext.EARTH_SPACE,
        { min: 200, max: 8000 },
        100,
        true,
        0.7,
        0.003
      )
    );

    // INNER_SOLAR: Wider compression to maintain stable framing while approaching heliocentric context
    this.scaleConfigs.set(
      ScaleContext.INNER_SOLAR,
      createCompressedScaleConfig(
        ScaleContext.INNER_SOLAR,
        { min: 500, max: 15000 },
        50,
        true,
        0.9,
        0.008
      )
    );

    // SOLAR_SYSTEM: Highest compression tier, preserving Earth↔Sun size/distance ratios in-context
    this.scaleConfigs.set(
      ScaleContext.SOLAR_SYSTEM,
      createCompressedScaleConfig(
        ScaleContext.SOLAR_SYSTEM,
        { min: 1000, max: 50000 },
        20,
        true,
        1.0,
        0.025
      )
    );
  }

  private createSun(): void {
    // Create sun sphere geometry
    const sunGeometry = new THREE.SphereGeometry(this.config.baseRadius, 64, 64);
    
    // Create sun material with glow effect
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9
    });

    // Create sun mesh
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sunMesh.visible = false;
    this.scene.add(this.sunMesh);

    // Create corona effect if enabled
    if (this.config.enableCorona) {
      this.createCorona();
    }

    // Create lighting if enabled
    if (this.config.enableLighting) {
      this.createLighting();
    }
  }

  private createCorona(): void {
    if (!this.sunMesh) return;

    const coronaGeometry = new THREE.SphereGeometry(this.config.baseRadius * 1.5, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.config.coronaIntensity * 0.3,
      side: THREE.BackSide
    });

    this.coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    this.coronaMesh.visible = false;
    this.scene.add(this.coronaMesh);
  }

  private createLighting(): void {
    // Create directional light (sun light)
    this.sunLight = new THREE.DirectionalLight(
      this.config.lightColor,
      this.config.lightIntensity
    );
    this.sunLight.position.set(0, 0, 1000);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);

    // Create ambient light for general illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(this.ambientLight);
  }

  /**
   * Update sun for the given scale context
   */
  public updateForScale(scaleContext: ScaleContext): void {
    if (this.disposed) return;

    const scaleConfig = this.scaleConfigs.get(scaleContext);
    if (!scaleConfig) {
      console.warn(`No configuration found for scale context: ${scaleContext}`);
      return;
    }

    // Update visibility
    const wasVisible = this.currentState.isVisible;
    this.currentState.isVisible = scaleConfig.sunVisible;
    this.currentState.currentScale = scaleContext;

    if (this.sunMesh) {
      this.sunMesh.visible = scaleConfig.sunVisible;
      
      if (scaleConfig.sunVisible) {
        const now = this.nowProvider();
        const ephemeris = computeSolarEphemeris(now);
        const adjusted = this.earthOrientation.describe(ephemeris.subsolarLongitudeDeg);
        const direction = computeSunDirectionGlobe(now, this.earthOrientation.getTextureLongitudeOffset());
        const position = direction.clone().multiplyScalar(scaleConfig.sunDistance);
        this.sunMesh.position.copy(position);
        this.currentState.currentPosition.copy(position);
        this.currentState.subsolarLatitudeDeg = ephemeris.subsolarLatitudeDeg;
        this.currentState.subsolarLongitudeDeg = ephemeris.subsolarLongitudeDeg;
        this.currentState.adjustedSubsolarLongitudeDeg = adjusted.adjustedSubsolarLongitudeDeg;

        // Update scale
        const scale = scaleConfig.sunRadius / this.config.baseRadius;
        this.sunMesh.scale.setScalar(scale);
        this.currentState.currentRadius = scaleConfig.sunRadius;

        // Update corona if it exists
        if (this.coronaMesh) {
          this.coronaMesh.visible = true;
          this.coronaMesh.position.copy(position);
          this.coronaMesh.scale.setScalar(scale);
        }

        // Update lighting
        if (this.sunLight) {
          this.sunLight.intensity = scaleConfig.lightIntensity;
          this.sunLight.position.copy(position);
          this.currentState.lightIntensity = scaleConfig.lightIntensity;
        }
      } else {
        // Hide corona when sun is hidden
        if (this.coronaMesh) {
          this.coronaMesh.visible = false;
        }
        this.currentState.subsolarLatitudeDeg = undefined;
        this.currentState.subsolarLongitudeDeg = undefined;
        this.currentState.adjustedSubsolarLongitudeDeg = undefined;
      }
    }

    // Notify about state change
    if (wasVisible !== this.currentState.isVisible && this.stateChangeCallback) {
      this.stateChangeCallback(this.getCurrentState());
    }
  }

  /**
   * Get current sun state
   */
  public getCurrentState(): SunState {
    return { ...this.currentState };
  }

  /**
   * Set state change callback
   */
  public onStateChange(callback: SunStateChangeCallback): void {
    this.stateChangeCallback = callback;
  }

  /**
   * Get scale configuration for a context
   */
  public getScaleConfig(context: ScaleContext): ScaleContextConfig | undefined {
    return this.scaleConfigs.get(context);
  }

  /**
   * Update sun configuration
   */
  public updateConfig(newConfig: Partial<SunConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate sun with new config if necessary
    if (newConfig.baseRadius || newConfig.lightColor || newConfig.enableCorona || newConfig.enableLighting) {
      this.disposeSun();
      this.createSun();
      // Reapply current scale
      this.updateForScale(this.currentState.currentScale);
    }
  }

  public setTextureLongitudeOffset(offsetDeg: number): void {
    this.earthOrientation.setTextureLongitudeOffset(offsetDeg);
    if (this.currentState.isVisible) {
      this.updateForScale(this.currentState.currentScale);
    }
  }

  public getTextureLongitudeOffset(): number {
    return this.earthOrientation.getTextureLongitudeOffset();
  }

  public setNowProvider(nowProvider: () => Date): void {
    this.nowProvider = nowProvider;
  }

  /**
   * Check if sun is visible in current scale
   */
  public isVisible(): boolean {
    return this.currentState.isVisible;
  }

  /**
   * Get sun mesh for direct manipulation (advanced usage)
   */
  public getSunMesh(): THREE.Mesh | null {
    return this.sunMesh;
  }

  /**
   * Get corona mesh for direct manipulation (advanced usage)
   */
  public getCoronaMesh(): THREE.Mesh | null {
    return this.coronaMesh;
  }

  /**
   * Get sun light for direct manipulation (advanced usage)
   */
  public getSunLight(): THREE.DirectionalLight | null {
    return this.sunLight;
  }

  private disposeSun(): void {
    if (this.sunMesh && this.scene) {
      this.scene.remove(this.sunMesh);
      this.sunMesh.geometry.dispose();
      if (this.sunMesh.material instanceof THREE.Material) {
        this.sunMesh.material.dispose();
      }
      this.sunMesh = null;
    }

    if (this.coronaMesh && this.scene) {
      this.scene.remove(this.coronaMesh);
      this.coronaMesh.geometry.dispose();
      if (this.coronaMesh.material instanceof THREE.Material) {
        this.coronaMesh.material.dispose();
      }
      this.coronaMesh = null;
    }

    if (this.sunLight && this.scene) {
      this.scene.remove(this.sunLight);
      this.sunLight = null;
    }

    if (this.ambientLight && this.scene) {
      this.scene.remove(this.ambientLight);
      this.ambientLight = null;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.disposed) return;

    this.disposeSun();
    this.stateChangeCallback = null;
    this.disposed = true;
  }
}
