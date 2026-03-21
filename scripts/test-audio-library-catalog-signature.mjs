import assert from "node:assert/strict";

import { createAudioLibraryCatalogSignatureTools } from "./features/audio-library-catalog-signature.js";

const tools = createAudioLibraryCatalogSignatureTools({
  normalizeSource: (value) => String(value ?? "").trim().toLowerCase(),
  normalizeRootPath: (value) => String(value ?? "").trim().replace(/\\/g, "/"),
  normalizeKind: (value) => String(value ?? "").trim().toLowerCase(),
  normalizeUsage: (value) => String(value ?? "").trim().toLowerCase(),
  hashString: (value) => String(value ?? "").length,
  normalizeCatalog: (catalog) => ({
    source: String(catalog?.source ?? ""),
    rootPath: String(catalog?.rootPath ?? ""),
    items: Array.isArray(catalog?.items) ? catalog.items : []
  }),
  getStoredCatalog: () => ({
    source: "data",
    rootPath: "music/boss",
    items: [
      {
        id: "music/boss/a.mp3",
        path: "music/boss/a.mp3",
        name: "A",
        category: "Boss",
        subcategory: "Act1",
        kind: "music",
        usage: "combat",
        extension: "mp3",
        tags: ["Boss", "Combat"]
      }
    ]
  })
});

const signatureA = tools.buildCatalogSignature({
  source: "data",
  rootPath: "music/boss",
  items: [
    {
      id: "music/boss/a.mp3",
      path: "music/boss/a.mp3",
      name: "A",
      category: "Boss",
      subcategory: "Act1",
      kind: "music",
      usage: "combat",
      extension: "mp3",
      tags: ["Boss", "Combat"]
    }
  ]
});

const signatureB = tools.buildStoredCatalogSignature();
assert.equal(signatureA, signatureB);
assert.notEqual(
  signatureA,
  tools.buildCatalogSignature({
    source: "data",
    rootPath: "music/boss",
    items: []
  })
);

process.stdout.write("audio library catalog signature validation passed\n");
