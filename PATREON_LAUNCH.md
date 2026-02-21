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
- `scripts/build-founders-release.ps1` (builds founders `module.json` + `module.zip` for private GitHub Releases)

## 3) Private GitHub Founders Channel (Different Manifest URL)

Use a private GitHub repo for founder-first updates and keep public releases in the current repo.

1. Create private repository (example):
   - `party-operations-founders`
2. In that private repo, create releases tagged as `vX.Y.Z`
3. Upload two assets each release:
   - `module.json`
   - `module.zip`
4. Share this manifest URL only with founders:
   - `https://github.com/<owner>/party-operations-founders/releases/latest/download/module.json`

Build those assets from this repo:

```powershell
./scripts/build-founders-release.ps1 -Version 2.1.0 -PrivateRepo <owner>/party-operations-founders
```

Output files:
- `dist/founders/module.json`
- `dist/founders/module.zip`
- `dist/founders/module.zip.sha256.txt`

## 4) Launch Checklist

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

## 5) Patreon Post Template

Title:
- `Party Operations Premium vX.Y.Z`

Body:
- What changed
- Download link (premium ZIP)
- Install steps (Foundry/Forge manual package upload)
- Notes on update compatibility

## 6) Important Notes

- A public manifest URL cannot enforce Patreon access control.
- If the goal is truly paid-only distribution, premium files/links must be private.
- Use separate module id for premium to avoid collisions with your public module install.
