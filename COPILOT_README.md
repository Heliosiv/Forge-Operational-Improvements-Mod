# NORDHOFNE – PARTY OPERATIONS SYSTEM
## COPILOT ENGINEERING DIRECTIVE

This repository contains structured systems for Party Operations within a survivalist, low-magic, high-consequence D&D 5e campaign set in Nordhofne. All generated code, mechanics, and documentation must prioritize modularity, GM flexibility, systemic tension, and long-term extensibility for Foundry VTT implementation.

Copilot must treat this project as a rules-engine + campaign-support toolkit — not a narrative generator.

---

# DESIGN PRINCIPLES

1. Minimal surface complexity, deep systemic interaction.
2. No over-automation that removes player decision weight.
3. Every mechanic must increase tension or meaningful choice.
4. Avoid micromanagement fatigue.
5. Systems must be modular and optional.
6. Mechanics must support survival, faction conflict, and moral pressure.
7. Always favor reusable templates over one-off systems.

---

# STRUCTURE EXPECTATIONS

All generated systems must be organized logically:

/systems
/roles
/logistics
/strain
/injury
/marching
/reputation
/war
/templates
/macros
/journal-templates
/tables

Do not mix unrelated systems into single files.

Each module must:
- Define purpose clearly
- Be mechanically independent
- Have minimal coupling to other systems
- Include expandable configuration values

---

# CORE SYSTEM MODULES

Copilot must support the following system categories:

## 1. Party Roles System
- Quartermaster
- Cartographer
- Marshal
- Steward
- Chronicler

Requirements:
- Mechanical benefits for active roles
- Consequences for neglected roles
- Scalable to party size
- No hard-coded party assumptions

---

## 2. Logistics & Resource System
Track:
- Rations
- Water
- Ammunition
- Torches
- Encumbrance tier
- Field supplies

Must:
- Integrate with long rest events
- Support supply drain modifiers
- Allow environmental modifiers
- Avoid spreadsheet-level bookkeeping

---

## 3. Marching & Tactical Doctrine
Support:
- Default formation
- Combat-ready formation
- Tight corridor formation
- Low visibility formation

System must:
- Influence surprise
- Influence ambush vulnerability
- Not require grid-level micromanagement

---

## 4. Injury & Recovery Expansion
Must:
- Support percentile injury system
- Include field stabilization mechanics
- Scale recovery time
- Integrate with environmental penalties
- Remain system-agnostic enough for adaptation

---

## 5. Strain / Cohesion Meter
Track:
- Fatigue accumulation
- Paranoia thresholds
- Moral fracture triggers
- Party cohesion decay

Must:
- Use clock-style escalation
- Trigger events at thresholds
- Avoid constant micro-tracking

---

## 6. Reputation & Faction Ledger
Track standing with:
- Religious authority
- Nobility
- Criminal factions
- Common populace

Must:
- Influence access
- Influence cost
- Influence narrative escalation
- Avoid arbitrary reputation math

---

## 7. War-Scale Abstraction
If implemented:
- Abstract units (no miniature-level combat)
- Use influence/resource points
- Territory control mapping
- Long-term resource drain

Keep war manageable and narrative-driven.

---

# FOUNDRY VTT INTEGRATION RULES

Generated macros or systems must:

- Use modular macro logic
- Avoid hard-coded actor IDs
- Use flags where appropriate
- Avoid performance-heavy loops
- Support journal-based configuration
- Allow manual override by GM

All automation must:
- Assist the GM
- Never replace adjudication
- Remain transparent

---

# MECHANICAL STYLE GUIDE

All mechanics must:

- Use bounded modifiers
- Avoid stacking complexity
- Favor advantage/disadvantage where possible
- Avoid excessive numeric inflation
- Keep DCs consistent with low-magic pressure

Avoid:
- Excessive passive bonuses
- Power creep
- Infinite resource loops
- Player-side automation that removes tension

---

# COPILOT GENERATION RULES

When generating systems:

1. Define configuration variables first.
2. Define triggers second.
3. Define mechanical effects third.
4. Provide example usage.
5. Provide optional scaling rules.
6. Provide toggle options for GM use.

When generating tables:
- Keep entries concise.
- Avoid verbose narrative.
- Maintain modular reuse potential.

When generating macros:
- Comment logic clearly.
- Separate config from execution.
- Avoid global pollution.

---

# EXPANSION EXPECTATIONS

All systems must be designed to allow:

- Future necromantic corruption mechanics
- Dark Host escalation layers
- House-level political conflict integration
- Regional travel hardship modifiers
- Seasonal impact (Leafturn, etc.)

Do not hard-code assumptions that block expansion.

---

# DEFINITION OF DONE

A module is complete when:

- It is mechanically modular
- It increases tension
- It is GM-adjustable
- It does not overload players
- It integrates cleanly into Foundry
- It does not contradict campaign tone

---

This project is not about mechanical density.

It is about operational pressure, faction weight, and survival-driven decision-making.

Systems must serve that tone.
