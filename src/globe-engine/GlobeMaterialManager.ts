// GlobeMaterialManager.ts
// AI-NOTE: See globe-shaders.artifact for shader/material documentation.

/**
 * GlobeMaterialManager: Handles all shader/material logic for the Globe Engine.
 * - See globe-shaders.artifact for shader/material documentation and extension.
 */

import * as THREE from 'three';

export class GlobeMaterialManager {
  private static createDayNightMaterial(dayTexture: THREE.Texture, nightTexture: THREE.Texture): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vec3 n = normalize(vNormal);
          vec3 l = normalize(sunDirection);
          float intensity = dot(n, l);
          float blend = smoothstep(-0.2, 0.25, intensity);
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          gl_FragColor = mix(nightColor, dayColor, blend);
        }
      `
    });
  }

  /**
   * Get material for a given mode and textures (see globe-shaders.artifact)
   */
  static getMaterialForMode(mode: string, textures: Record<string, THREE.Texture>): THREE.Material {
    // AI-NOTE: See globe-shaders.artifact for shader/material documentation.
    switch (mode) {
      case 'hologram':
        // Example: Hologram material using earthDark texture
        return new THREE.MeshPhongMaterial({
          map: textures.earthDarkTexture,
          color: 0x00ffff,
          transparent: true,
          opacity: 0.8,
        });
      case 'blueMarble':
        return new THREE.MeshBasicMaterial({ map: textures.blueMarbleTexture });
      case 'dayNight':
        return this.createDayNightMaterial(
          textures.earthDayTexture,
          textures.earthDarkTexture || textures.earthDayTexture
        );
      default:
        return new THREE.MeshBasicMaterial({ map: textures.earthDayTexture });
    }
  }

  static updateSunDirection(material: THREE.Material | null, sunDirection: THREE.Vector3): void {
    if (!material || !(material instanceof THREE.ShaderMaterial)) return;
    const uniforms = material.uniforms as Record<string, { value: unknown }> | undefined;
    if (!uniforms || !uniforms.sunDirection) return;
    uniforms.sunDirection.value = sunDirection.clone().normalize();
  }

  /**
   * Dispose of material resources
   */
  static disposeMaterial(material: THREE.Material) {
    material.dispose();
  }
}
