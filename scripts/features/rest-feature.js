export function createRestFeatureModule(deps = {}) {
  return {
    id: "rest",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("rest");
    }
  };
}
