import { validateEvent, Event as NostrEvent } from 'nostr-tools';
import { GeoIntConfig, DropReason, ValidationResult } from './types';

const APP_TAGS = ['starcom', 'starcom-geoint', 'navcom'];

export function validateEnvelope(event: NostrEvent, config: GeoIntConfig): ValidationResult {
  if (event.kind !== 1) return { ok: false, reason: 'invalid_kind' };
  if (!validateEvent(event)) return { ok: false, reason: 'invalid_sig' };
  if (typeof event.content !== 'string') return { ok: false, reason: 'invalid_shape' };
  const contentSize = new TextEncoder().encode(event.content).length;
  if (contentSize > config.contentSizeCapBytes) return { ok: false, reason: 'too_large' };
  if (!Array.isArray(event.tags)) return { ok: false, reason: 'invalid_tags' };
  if (event.tags.length > config.tagCountCap) return { ok: false, reason: 'too_many_tags' };
  for (const tag of event.tags) {
    if (!Array.isArray(tag)) return { ok: false, reason: 'invalid_tags' };
    for (const part of tag) {
      if (typeof part !== 'string') continue;
      if (part.length > config.tagLengthCap) return { ok: false, reason: 'too_many_tags' };
    }
  }
  const hasAppTag = event.tags.some(tag => {
    if (!Array.isArray(tag) || tag.length < 2) return false;
    const key = String(tag[0] || '').toLowerCase();
    const val = String(tag[1] || '').toLowerCase();
    return (key === 'app' || key === 'client') && APP_TAGS.includes(val);
  });
  if (!hasAppTag) return { ok: false, reason: 'missing_app_tag' };
  return { ok: true };
}

export function boundsCheck(lat?: number, lon?: number): ValidationResult {
  if (lat === undefined || lon === undefined) return { ok: false, reason: 'invalid_geo' };
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, reason: 'invalid_geo' };
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return { ok: false, reason: 'bounds' };
  return { ok: true };
}
