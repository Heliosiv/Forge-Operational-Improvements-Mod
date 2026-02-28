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
  isGeneratingLoot: boolean;
  lootError: string | null;
  hasLootError: boolean;
  lootStatus: string;
  settings: PartyOpsConfig;
  snapshots: PartyOpsSnapshots;
  snapshotsText: {
    restWatch: string;
    marchingOrder: string;
  };
  lootDraft: {
    cr: number;
    scarcity: ScarcityLevel;
    target: LootGenerationInput["target"];
  };
  lootDraftView: {
    scarcityAbundant: boolean;
    scarcityNormal: boolean;
    scarcityScarce: boolean;
    targetPocket: boolean;
    targetHorde: boolean;
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
  private lootDraft: PartyOpsAppData["lootDraft"] = {
    cr: 5,
    scarcity: "normal",
    target: "pocket"
  };
  private isGeneratingLoot = false;
  private lootError: string | null = null;
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
      classes: [...(base.classes ?? []), "party-operations", "party-operations-app"],
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
      isGeneratingLoot: this.isGeneratingLoot,
      lootError: this.lootError,
      hasLootError: Boolean(this.lootError),
      lootStatus: this.isGeneratingLoot ? "Generating loot…" : this.lootResult ? "Loot generated." : "Ready.",
      settings: this.services.getSettingsSnapshot(),
      snapshots: {
        restWatch,
        marchingOrder
      },
      snapshotsText: {
        restWatch: JSON.stringify(restWatch ?? {}, null, 2),
        marchingOrder: JSON.stringify(marchingOrder ?? {}, null, 2)
      },
      lootDraft: {
        ...this.lootDraft
      },
      lootDraftView: {
        scarcityAbundant: this.lootDraft.scarcity === "abundant",
        scarcityNormal: this.lootDraft.scarcity === "normal",
        scarcityScarce: this.lootDraft.scarcity === "scarce",
        targetPocket: this.lootDraft.target === "pocket",
        targetHorde: this.lootDraft.target === "horde"
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

    const crRaw = Number(crInput?.value ?? this.lootDraft.cr);
    const cr = Number.isFinite(crRaw) ? Math.min(30, Math.max(0, Math.floor(crRaw))) : this.lootDraft.cr;
    const scarcity = String(scarcityInput?.value ?? this.lootDraft.scarcity) as ScarcityLevel;
    const target = String(targetInput?.value ?? this.lootDraft.target) as LootGenerationInput["target"];

    this.lootDraft = { cr, scarcity, target };
    this.isGeneratingLoot = true;
    this.lootError = null;
    void this.render(false);

    try {
      this.lootResult = await this.services.generateLoot(this.lootDraft);
    } catch (error) {
      this.lootResult = null;
      const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
      this.lootError = `Loot generation failed: ${message}`;
      ui?.notifications?.error?.(this.lootError);
    } finally {
      this.isGeneratingLoot = false;
      void this.render(false);
    }
  }
}

export function createPartyOperationsApp(): PartyOperationsApp {
  return new PartyOperationsApp();
}
