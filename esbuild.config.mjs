import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const optionsESM = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node26',
  format: 'esm',
  sourcemap: true,
  minify: false,
};

if (isWatch) {
  esbuild.context(optionsESM).then(ctx => ctx.watch()).then(() => {
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(optionsESM).then(() => {
    console.log('Build complete.');
  }).catch(() => process.exit(1));
}
