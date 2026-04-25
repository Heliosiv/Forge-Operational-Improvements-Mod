import { attachModuleApi } from "../../core/api-registry.js";
import { MODULE_ID } from "../../core/constants.js";
import { createRefactorNavigationApi } from "../navigation/navigation-api.js";
import { getRefactorFeatureManifest } from "../rebuild/feature-manifest.js";
import { getLegacySourceSlices } from "../rebuild/legacy-source-map.js";
import { emitSocketRefresh } from "../sockets/refresh-socket.js";
import { getRuntimeStateSnapshot } from "../state/runtime-state.js";

export function buildRefactorModuleApi({ moduleId = MODULE_ID } = {}) {
  const navigation = createRefactorNavigationApi();

  return {
    moduleId,
    mode: "modular-refactor-shell",
    underRefactor: true,
    legacyRuntimePath: "legacy/party-operations-monolith.js",
    navigation,
    refresh: {
      emit: emitSocketRefresh
    },
    rebuild: {
      getFeatureManifest: getRefactorFeatureManifest,
      getLegacySourceSlices,
      getRuntimeStateSnapshot
    }
  };
}

export function registerRefactorModuleApi(options = {}) {
  const api = buildRefactorModuleApi(options);
  return attachModuleApi({
    moduleId: options.moduleId ?? MODULE_ID,
    api,
    gameRef: options.gameRef,
    globalRoot: options.globalRoot
  });
}
