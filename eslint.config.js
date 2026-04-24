import js from "@eslint/js";
import globals from "globals";

const foundryGlobals = {
  Actor: "readonly",
  Application: "readonly",
  AudioHelper: "readonly",
  ChatMessage: "readonly",
  CONST: "readonly",
  CONFIG: "readonly",
  Dialog: "readonly",
  FilePicker: "readonly",
  Folder: "readonly",
  FormApplication: "readonly",
  Handlebars: "readonly",
  Hooks: "readonly",
  Item: "readonly",
  JournalEntry: "readonly",
  Roll: "readonly",
  TextEditor: "readonly",
  canvas: "readonly",
  duplicate: "readonly",
  foundry: "readonly",
  fromUuid: "readonly",
  fromUuidSync: "readonly",
  game: "readonly",
  getTemplate: "readonly",
  loadTemplates: "readonly",
  mergeObject: "readonly",
  renderTemplate: "readonly",
  ui: "readonly"
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "release/**",
      "reports/**",
      "baseline-*/**",
      "head-*/**",
      ".staging-local-test/**",
      ".tmp_level/**",
      ".playwright-cli/**",
      "tmp-*",
      ".tmp_*",
      "ALL_CODE.txt"
    ]
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs", "*.mjs", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...foundryGlobals
      }
    },
    rules: {
      "no-async-promise-executor": "warn",
      "no-constant-binary-expression": "warn",
      "no-control-regex": "warn",
      "no-dupe-keys": "warn",
      "no-empty": "warn",
      "no-extra-boolean-cast": "warn",
      "no-unsafe-finally": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unused-private-class-members": "warn",
      "no-undef": "warn",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "preserve-caught-error": "warn"
    }
  },
  {
    files: ["scripts/**/*.cjs", "*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    }
  }
];
