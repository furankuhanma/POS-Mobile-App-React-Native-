// Stub for expo-sqlite on web — prevents .wasm bundling errors.
// All exports are safe no-ops.
module.exports = {
  openDatabaseAsync: async () => null,
  openDatabaseSync: () => null,
};
