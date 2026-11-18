const quote = (files) => files.map((file) => `"${file}"`).join(' ');

const inDir = (dir, command) => (files) =>
  `bash -c 'cd ${dir} && ${command} "$@"' _ ${quote(files)}`;

module.exports = {
  'apps/web/**/*.{js,jsx,ts,tsx}': inDir('apps/web', 'eslint --max-warnings 0'),
  'apps/docs/**/*.{js,jsx,ts,tsx}': inDir(
    'apps/docs',
    'eslint --max-warnings 0',
  ),
  'packages/ui/**/*.{js,jsx,ts,tsx}': inDir(
    'packages/ui',
    'eslint --max-warnings 0',
  ),
  'apps/api/**/*.ts': inDir('apps/api', 'oxlint --type-aware'),
  '**/*.{js,cjs,mjs,jsx,ts,tsx,json,md,css}': 'prettier --write',
};
