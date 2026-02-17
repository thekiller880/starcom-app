import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs, ensureDir, readJson, writeJson } from './shared';

interface DatasetEntry {
  id: string;
  version?: string;
  file: string;
  sha256?: string;
  license?: string;
  updated?: string;
}

interface SourceManifest {
  datasets?: DatasetEntry[];
}

interface ValidationIssue {
  level: 'error' | 'warn';
  message: string;
}

function sha256File(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function detectProvider(datasets: DatasetEntry[]): string {
  const licenses = datasets.map((d) => String(d.license ?? '').toLowerCase()).join(' ');
  if (licenses.includes('natural earth')) return 'natural-earth';
  if (licenses.includes('overture')) return 'overture';
  return 'unknown';
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const sourceManifestPath = path.join(args.sourceDir, 'manifest.json');
  const outputPath = path.join(args.generatedDir, 'source-validation.json');

  const issues: ValidationIssue[] = [];

  if (!fs.existsSync(sourceManifestPath)) {
    console.error(`[geo:source:validate] missing source manifest: ${sourceManifestPath}`);
    process.exit(1);
  }

  const sourceManifest = readJson<SourceManifest>(sourceManifestPath);
  const datasets = Array.isArray(sourceManifest.datasets) ? sourceManifest.datasets : [];
  if (!datasets.length) {
    console.error('[geo:source:validate] source manifest has no datasets entries');
    process.exit(1);
  }

  const validated = datasets.map((dataset) => {
    const filePath = path.join(args.sourceDir, dataset.file);
    if (!fs.existsSync(filePath)) {
      issues.push({ level: 'error', message: `missing dataset file for ${dataset.id}: ${filePath}` });
      return {
        ...dataset,
        filePath,
        exists: false,
        actualSha256: null,
        shaMatch: false
      };
    }

    const actualSha256 = sha256File(filePath);
    const expectedSha = dataset.sha256?.toLowerCase();
    const shaMatch = expectedSha ? expectedSha === actualSha256.toLowerCase() : false;

    if (!expectedSha) {
      issues.push({ level: 'warn', message: `dataset ${dataset.id} is missing expected sha256 in source manifest` });
    } else if (!shaMatch) {
      issues.push({ level: 'error', message: `sha256 mismatch for ${dataset.id}: expected ${expectedSha} got ${actualSha256}` });
    }

    return {
      ...dataset,
      filePath,
      exists: true,
      actualSha256,
      shaMatch
    };
  });

  const lodCoverage = [0, 1, 2].map((lod) => {
    const territories = path.join(args.sourceDir, `world-territories-lod${lod}.geojson`);
    const borders = path.join(args.sourceDir, `world-borders-lod${lod}.geojson`);
    const territoriesExists = fs.existsSync(territories);
    const bordersExists = fs.existsSync(borders);
    if (!territoriesExists) {
      issues.push({ level: 'error', message: `missing LOD${lod} territories source: ${territories}` });
    }
    if (!bordersExists) {
      issues.push({ level: 'warn', message: `missing LOD${lod} borders source: ${borders}` });
    }
    return {
      lod,
      territories,
      borders,
      territoriesExists,
      bordersExists
    };
  });

  const provider = detectProvider(datasets);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');

  ensureDir(path.dirname(outputPath));
  writeJson(outputPath, {
    generatedAt: new Date().toISOString(),
    sourceDir: args.sourceDir,
    provider,
    status: errors.length ? 'fail' : warnings.length ? 'warn' : 'pass',
    datasets: validated,
    lodCoverage,
    issues,
    summary: {
      datasets: validated.length,
      errors: errors.length,
      warnings: warnings.length
    }
  });

  warnings.forEach((w) => console.warn(`[geo:source:validate] WARN ${w.message}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`[geo:source:validate] ERROR ${e.message}`));
    console.error(`[geo:source:validate] failed; report: ${outputPath}`);
    process.exit(1);
  }

  console.log(`[geo:source:validate] PASS (${validated.length} datasets). report: ${outputPath}`);
}

main();
