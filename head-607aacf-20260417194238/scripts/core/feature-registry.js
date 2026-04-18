export function createFeatureRegistrar({
  features = []
} = {}) {
  return function registerFeatureModules() {
    for (const feature of features) {
      if (typeof feature?.register === "function") feature.register();
    }
  };
}
