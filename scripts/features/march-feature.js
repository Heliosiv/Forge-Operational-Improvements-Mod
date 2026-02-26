export function createMarchFeatureModule(deps = {}) {
  return {
    id: "march",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("march");
    }
  };
}
