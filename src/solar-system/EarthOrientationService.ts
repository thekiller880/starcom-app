import { normalizeLongitude } from '../utils/globeCoordinates';

export type EarthOrientationState = {
  textureLongitudeOffsetDeg: number;
  subsolarLongitudeDeg: number;
  adjustedSubsolarLongitudeDeg: number;
};

export class EarthOrientationService {
  private textureLongitudeOffsetDeg = 0;

  setTextureLongitudeOffset(offsetDeg: number): void {
    this.textureLongitudeOffsetDeg = normalizeLongitude(offsetDeg);
  }

  getTextureLongitudeOffset(): number {
    return this.textureLongitudeOffsetDeg;
  }

  applyTextureOffset(longitudeDeg: number): number {
    return normalizeLongitude(longitudeDeg + this.textureLongitudeOffsetDeg);
  }

  describe(subsolarLongitudeDeg: number): EarthOrientationState {
    return {
      textureLongitudeOffsetDeg: this.textureLongitudeOffsetDeg,
      subsolarLongitudeDeg,
      adjustedSubsolarLongitudeDeg: this.applyTextureOffset(subsolarLongitudeDeg)
    };
  }
}
