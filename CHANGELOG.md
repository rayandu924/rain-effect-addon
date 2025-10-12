# Changelog - Rain Effect Addon

## v2.1.2 (2025-10-12) - Structure Update

### 🔄 Migration: `addon.json` → `manifest.json`

**Breaking Change:** L'addon utilise maintenant `manifest.json` au lieu de `addon.json`.

#### ✅ Nouvelle Structure (manifest.json)

```json
{
  "name": "Rain Effect Responsive",
  "version": "2.1.1",
  "description": "...",
  "author": "MyWallpaper",
  "type": "visual-effect",
  "categories": ["weather", "animation"],
  "settings": { ... }
}
```

#### ❌ Ancienne Structure (addon.json - deprecated)

```json
{
  "metadata": {
    "name": "...",
    "version": "...",
    ...
  },
  "settings": { ... }
}
```

### 📋 Changements

- ✅ **Fichier créé:** `manifest.json` (nouvelle structure plate)
- ✅ **Fichier renommé:** `addon.json` → `addon.json.old` (backup)
- ✅ **Ajout champs:** `type` et `categories` pour meilleure catégorisation
- ✅ **Compatibilité:** Compatible avec MyWallpaper frontend refactored (types stricts TypeScript)

### 🔧 Pour les développeurs

Cette migration est nécessaire pour:
- **Type safety:** Compatibilité avec le nouveau système de types strict (TypeScript)
- **Standardisation:** `manifest.json` est le standard pour tous les addons MyWallpaper
- **Performance:** Structure plate plus efficace pour le parsing

### 🚀 Aucun impact utilisateur

Les utilisateurs existants peuvent continuer d'utiliser l'addon sans changement.
Le système MyWallpaper gère automatiquement la migration.

---

## v2.1.1 (2024-08-28)

- Amélioration du système de scaling responsive
- Optimisations de performance

## v2.1.0 (2024-08-25)

- **Refonte majeure:** Tailles adaptatives avec quantité constante
- Nouveau système de scaling basé sur la diagonale du conteneur
- Support iframe parfait avec ResizeObserver

## v2.0.0

- Version initiale avec scaling adaptatif (approche densité variable)
