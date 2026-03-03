export default {
  'src/**/*.{ts,tsx}': (files) => [
    `pnpx @biomejs/biome check --write ${files.map((f) => `"${f}"`).join(' ')}`,
  ],
  'src-tauri/src/**/*.rs': () => 'cargo fmt --all --manifest-path src-tauri/Cargo.toml',
};
