import fs from 'node:fs';
import path from 'node:path';
import { copyDirRecursive, ensureDir, parseArgs } from './shared';

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.generatedDir)) {
    console.error(`[geo:publish] Generated directory not found: ${args.generatedDir}`);
    process.exit(1);
  }

  ensureDir(path.dirname(args.publicDir));
  copyDirRecursive(args.generatedDir, args.publicDir);

  console.log(`[geo:publish] Published territories artifacts to ${args.publicDir}`);
}

main();
