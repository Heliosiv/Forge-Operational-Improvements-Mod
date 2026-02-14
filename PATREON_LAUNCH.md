# Patreon Launch Plan ($3.50 Tier)

This project currently ships as a public Forge/GitHub manifest module. That is great for free distribution, but it is **not** a protected paid channel.

Use this launch plan to start selling access at `$3.50` while continuing development updates.

## 1) Pick Distribution Model

### Model A (Recommended): Lite + Premium Split
- Keep current module as free/lite (`party-operations`)
- Create premium module as separate package id (`party-operations-premium`)
- Deliver premium ZIP to patrons only (Patreon posts/messages)

### Model B (Fastest Temporary): Paid Access To Current Build
- Stop posting public premium download links
- Deliver the build ZIP only to patrons
- Existing public manifest users can still access old public releases

## 2) Premium Packaging Setup (Now Included)

Files added in this repo:
- `module.premium.template.json` (premium module manifest template)
- `scripts/build-premium-package.ps1` (builds premium ZIP artifact)

## 3) Launch Checklist

1. Copy `module.premium.template.json` to `module.premium.json`
2. Set:
   - `title` (e.g. `Party Operations Premium`)
   - `version`
   - `authors`
   - `id` = `party-operations-premium`
3. Build premium package:
   - `./scripts/build-premium-package.ps1 -Version 2.0.3`
4. Upload resulting ZIP from `dist/premium/`
5. Create Patreon post for `$3.50` tier with:
   - changelog
   - install steps
   - update notes

## 4) Patreon Post Template

Title:
- `Party Operations Premium vX.Y.Z`

Body:
- What changed
- Download link (premium ZIP)
- Install steps (Foundry/Forge manual package upload)
- Notes on update compatibility

## 5) Important Notes

- A public manifest URL cannot enforce Patreon access control.
- If the goal is truly paid-only distribution, premium files/links must be private.
- Use separate module id for premium to avoid collisions with your public module install.
