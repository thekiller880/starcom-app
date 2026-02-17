import fs from 'node:fs';
import path from 'node:path';

export type LOD = 0 | 1 | 2;

export const LODS: LOD[] = [0, 1, 2];

export const ROOT = process.cwd();
export const GENERATED_ROOT = path.join(ROOT, '.generated', 'geopolitical', 'territories-baked');
export const PUBLIC_ROOT = path.join(ROOT, 'public', 'geopolitical', 'territories-baked');

export interface CliArgs {
  lods: LOD[];
  sourceDir: string;
  generatedDir: string;
  publicDir: string;
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export function parseArgs(argv: string[]): CliArgs {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      map.set(key, next);
      i++;
    } else {
      map.set(key, 'true');
    }
  }

  const lodRaw = map.get('lods') ?? map.get('lod') ?? '0,1,2';
  const lods = lodRaw
    .split(',')
    .map(v => Number(v.trim()))
    .filter(v => v === 0 || v === 1 || v === 2) as LOD[];

  return {
    lods: lods.length ? lods : LODS,
    sourceDir: map.get('source-dir') ?? path.join(ROOT, 'public', 'geopolitical'),
    generatedDir: map.get('generated-dir') ?? GENERATED_ROOT,
    publicDir: map.get('public-dir') ?? PUBLIC_ROOT
  };
}

export function copyDirRecursive(sourceDir: string, destinationDir: string): void {
  ensureDir(destinationDir);
  fs.cpSync(sourceDir, destinationDir, { recursive: true, force: true });
}
