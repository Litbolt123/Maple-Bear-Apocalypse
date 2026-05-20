# Rename GitHub repository

Target name: **`Maple-Bear-Apocalypse`** (matches **Maple Bear Apocalypse** / **M.B.A**).

GitHub cannot be renamed from this repo without the website or [GitHub CLI](https://cli.github.com/). Do this once on GitHub, then fix your local clone.

## On GitHub (web)

1. Open **https://github.com/Litbolt123/Maple-Bear-Take-Over** (current URL).
2. **Settings** → **General** → **Repository name**.
3. Change to: `Maple-Bear-Apocalypse`
4. Confirm rename. GitHub redirects the old URL for a while.

## On your PC (after rename)

```powershell
cd "path\to\Maple-Bear-Take-Over"
git remote set-url origin https://github.com/Litbolt123/Maple-Bear-Apocalypse.git
git remote -v
```

Optional: rename the local folder to `Maple-Bear-Apocalypse` (purely cosmetic).

## Already updated in this repo (pending push)

- `package.json` → `repository`, `bugs`, `homepage` URLs
- Marketing docs should use the new URLs when you next edit them

Old links (`…/Maple-Bear-Take-Over`) redirect after rename if GitHub redirect is enabled.

## With GitHub CLI (if installed)

```bash
gh repo rename Maple-Bear-Apocalypse --repo Litbolt123/Maple-Bear-Take-Over
```
