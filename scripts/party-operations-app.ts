import {
  DEFAULT_PARTY_OPS_CONFIG,
  type PartyOpsConfig,
  type ScarcityLevel,
  validateConfig
} from "./party-ops-config";
import {
  type LootGenerationInput,
  type LootGenerationOutput,
  type LootCatalogItem,
  generateSuggestedLoot
} from "./loot-generation-engine";

type PartyOpsTab = "rest-watch" | "marching-order" | "loot";

interface PartyOpsSnapshots {
  restWatch: unknown;
  marchingOrder: unknown;
}

interface PartyOpsAppData {
  activeTab: PartyOpsTab;
  tabRestWatch: boolean;
  tabMarchingOrder: boolean;
  tabLoot: boolean;
  settings: PartyOpsConfig;
  snapshots: PartyOpsSnapshots;
  snapshotsText: {
    restWatch: string;
    marchingOrder: string;
  };
  lootResult: LootGenerationOutput | null;
}

interface PartyOpsUiServices {
  getSettingsSnapshot(): PartyOpsConfig;
  getRestWatchSnapshot(): unknown;
  getMarchingOrderSnapshot(): unknown;
  generateLoot(input: LootGenerationInput): Promise<LootGenerationOutput>;
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapSystemRarityToLootRarity(raw: unknown): LootCatalogItem["rarity"] {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "legendary") return "legendary";
  if (value === "very-rare" || value === "very rare") return "veryRare";
  if (value === "rare") return "rare";
  if (value === "uncommon") return "uncommon";
  return "common";
}

class PartyOpsDefaultUiServices implements PartyOpsUiServices {
  private readonly moduleId = "party-operations";

  getSettingsSnapshot(): PartyOpsConfig {
    const raw = game?.settings?.get?.(this.moduleId, "typedConfig") ?? DEFAULT_PARTY_OPS_CONFIG;
    return validateConfig(raw);
  }

  getRestWatchSnapshot(): unknown {
    return game?.settings?.get?.(this.moduleId, "restWatchState") ?? {};
  }

  getMarchingOrderSnapshot(): unknown {
    return game?.settings?.get?.(this.moduleId, "marchingOrderState") ?? {};
  }

  async generateLoot(input: LootGenerationInput): Promise<LootGenerationOutput> {
    const config = this.getSettingsSnapshot();
    const catalog = this.buildCatalogFromWorldItems();
    return generateSuggestedLoot(input, catalog, config);
  }

  private buildCatalogFromWorldItems(): LootCatalogItem[] {
    const worldItems = Array.from(game?.items?.contents ?? []);
    return worldItems
      .map((item: any) => {
        const uuid = String(item?.uuid ?? "").trim();
        const name = String(item?.name ?? "").trim();
        if (!uuid || !name) return null;
        return {
          uuid,
          name,
          rarity: mapSystemRarityToLootRarity(item?.system?.rarity),
          weight: 1,
          maxQty: 1
        } as LootCatalogItem;
      })
      .filter((entry: LootCatalogItem | null): entry is LootCatalogItem => Boolean(entry));
  }
}

export class PartyOperationsApp extends Application {
  private activeTab: PartyOpsTab = "rest-watch";
  private lootResult: LootGenerationOutput | null = null;
  private readonly services: PartyOpsUiServices;

  constructor(options: Partial<ApplicationOptions> = {}, services: PartyOpsUiServices = new PartyOpsDefaultUiServices()) {
    super(options);
    this.services = services;
  }

  static get defaultOptions(): ApplicationOptions {
    const base = super.defaultOptions;
    return {
      ...base,
      id: "party-operations-app",
      title: "Party Operations",
      template: "modules/party-operations/templates/party-operations-app.hbs",
      width: 980,
      height: 720,
      resizable: true
    };
  }

  async getData(): Promise<PartyOpsAppData> {
    const restWatch = this.services.getRestWatchSnapshot();
    const marchingOrder = this.services.getMarchingOrderSnapshot();
    return {
      activeTab: this.activeTab,
      tabRestWatch: this.activeTab === "rest-watch",
      tabMarchingOrder: this.activeTab === "marching-order",
      tabLoot: this.activeTab === "loot",
      settings: this.services.getSettingsSnapshot(),
      snapshots: {
        restWatch,
        marchingOrder
      },
      snapshotsText: {
        restWatch: JSON.stringify(restWatch ?? {}, null, 2),
        marchingOrder: JSON.stringify(marchingOrder ?? {}, null, 2)
      },
      lootResult: this.lootResult
    };
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    html.find("[data-action='switch-tab']").on("click", (event) => {
      const target = event.currentTarget as HTMLElement;
      const nextTab = String(target?.dataset?.tab ?? "rest-watch") as PartyOpsTab;
      this.activeTab = ["rest-watch", "marching-order", "loot"].includes(nextTab) ? nextTab : "rest-watch";
      void this.render(false);
    });

    html.find("[data-action='generate-loot']").on("click", async (event) => {
      event.preventDefault();
      await this.handleGenerateLoot(html);
    });
  }

  private async handleGenerateLoot(html: JQuery): Promise<void> {
    const root = html[0] as HTMLElement | undefined;
    if (!root) return;

    const crInput = root.querySelector("input[name='lootCr']") as HTMLInputElement | null;
    const scarcityInput = root.querySelector("select[name='lootScarcity']") as HTMLSelectElement | null;
    const targetInput = root.querySelector("select[name='lootTarget']") as HTMLSelectElement | null;

    const cr = Number(crInput?.value ?? 1);
    const scarcity = String(scarcityInput?.value ?? "normal") as ScarcityLevel;
    const target = String(targetInput?.value ?? "pocket") as LootGenerationInput["target"];

    this.lootResult = await this.services.generateLoot({ cr, scarcity, target });
    void this.render(false);
  }
}

export function createPartyOperationsApp(): PartyOperationsApp {
  return new PartyOperationsApp();
}
