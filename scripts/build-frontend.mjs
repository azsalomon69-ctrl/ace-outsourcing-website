import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import * as esbuild from 'esbuild';
import { minify } from 'html-minifier-terser';

const root = process.cwd();
const sourceDir = resolve(root, 'frontend');
const outputDir = resolve(root, 'dist');
const cursorBootstrap = `<style>@media(pointer:fine){*,*::before,*::after{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%23F5FFFF' stroke='%23000' stroke-width='1' d='M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z'/%3E%3C/svg%3E") 7 4,auto!important}}</style>`;
const transitionBootstrap = '<script src="transition-startup.js"></script>';

const htmlOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: false,
  minifyJS: false,
};

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(fullPath));
    else result.push(fullPath);
  }
  return result;
}

async function removeSourceMaps(directory) {
  for (const filePath of await filesIn(directory)) {
    if (filePath.endsWith('.map')) await rm(filePath, { force: true });
  }
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true, force: true, filter: (source) => !source.endsWith('.map') });

for (const filePath of await filesIn(sourceDir)) {
  const outputPath = join(outputDir, relative(sourceDir, filePath));
  if (filePath.endsWith('.html')) {
    const html = (await readFile(filePath, 'utf8')).replace(/<head>/i, `<head>${cursorBootstrap}${transitionBootstrap}`);
    await writeFile(outputPath, await minify(html, htmlOptions));
  }
  if (filePath.endsWith('.css')) {
    const css = await readFile(filePath, 'utf8');
    const result = await esbuild.transform(css, { loader: 'css', minify: true, legalComments: 'none' });
    await writeFile(outputPath, result.code);
  }
  if (filePath.endsWith('.js') && relative(sourceDir, filePath).split(/[\\/]/).length === 1) {
    const javascript = await readFile(filePath, 'utf8');
    const result = await esbuild.transform(javascript, {
      loader: 'js',
      minify: true,
      sourcemap: false,
      legalComments: 'none',
      target: ['es2020'],
    });
    await writeFile(outputPath, result.code);
  }
}

const lottiePath = join(outputDir, 'vendor', 'lottiefiles', 'lottie-player.js');
try {
  const lottie = await readFile(lottiePath, 'utf8');
  await writeFile(lottiePath, lottie.replace(/\n?\/\/# sourceMappingURL=.*$/m, ''));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await removeSourceMaps(outputDir);
const outputFiles = await filesIn(outputDir);
if (outputFiles.some((filePath) => filePath.endsWith('.map'))) throw new Error('Production source map found in dist.');
await Promise.all(outputFiles.map(async (filePath) => {
  if ((await stat(filePath)).size === 0) throw new Error(`Empty production file: ${filePath}`);
}));

console.log(`Production build complete: ${outputFiles.length} files written to dist.`);
