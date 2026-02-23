# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**
- TypeScript 5.7.3 - Main development language, strict mode enabled with DOM and DOM.Iterable libs
- HTML/CSS - UI templates and styling via Lit framework
- JavaScript - Runtime execution in web environment

## Runtime

**Environment:**
- Browser runtime (Home Assistant frontend environment)
- Target: ES2017+ (compiled down from TypeScript)
- No Node.js runtime dependencies in production

**Package Manager:**
- npm 10+ (from package-lock.json structure)
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- `lit` 2.2.0+ - Web components framework, LitElement base class for main component
- `@material/web` 2.2.0 - Material Design 3 components (imported but used selectively)
- `dayjs` 1.11.13 - Date/time parsing and formatting

**Dev/Build:**
- `rollup` 4.34.8 - Module bundler for production builds
- `esbuild` 0.25.2 - TypeScript transpiler via rollup-plugin-esbuild 6.2.1
- `rollup-plugin-esbuild` 6.2.1 - Rollup integration for esbuild
- TypeScript 5.7.3 - Static type checking and compilation

## Key Dependencies

**Critical:**
- `lit` - Core rendering and Web Components API, used for `LitElement`, decorators (`@customElement`, `@property`), and templating (`html`, `nothing`, `TemplateResult`)
- `@material/web` - Material Design components for UI consistency
- `dayjs` - Date manipulation, parsing, and formatting (used throughout format and translation modules)
- `@mdi/js` - Material Design Icons (7.4.47) - Likely used for weather, event, and UI icons

**Dev/Build Infrastructure:**
- `@rollup/plugin-typescript` 12.1.2 - TypeScript compilation during bundling
- `@rollup/plugin-terser` 0.4.4 - Code minification for production
- `@rollup/plugin-replace` 6.0.2 - Build-time variable replacement (version, log levels)
- `@rollup/plugin-commonjs` 28.0.3 - CommonJS compatibility
- `@rollup/plugin-node-resolve` 16.0.1 - Node module resolution
- `@rollup/plugin-json` 6.1.0 - JSON file imports

**Linting & Formatting:**
- `eslint` 9.21.0 - Code linting
- `@typescript-eslint/eslint-plugin` 8.25.0 - TypeScript-specific linting rules
- `@typescript-eslint/parser` 8.25.0 - TypeScript parser for ESLint
- `eslint-config-prettier` 10.0.2 - ESLint + Prettier integration
- `eslint-plugin-prettier` 5.2.3 - Prettier enforcement via ESLint
- `eslint-plugin-import` 2.31.0 - Import/export linting
- `prettier` 3.5.2 - Code formatter

**Type Support:**
- `@types/node` 22.13.5 - Node.js type definitions
- `@eslint/eslintrc` 3.3.0 - ESLint configuration utilities

## Configuration

**Environment:**
- No .env file required - configuration via Home Assistant `setConfig()` method
- Build-time settings via NODE_ENV (dev/prod mode detection)
- Home Assistant connection provided through `hass` property

**Build:**
- `rollup.config.mjs` - Main bundler configuration with plugin chain
- `tsconfig.json` - TypeScript compiler settings (strict mode, ES2017 target, path aliases)
- `.prettierrc` - Prettier formatting configuration (100px width, 2-space tabs, trailing commas)
- `eslint.config.mjs` - ESLint configuration using flat config format

**Build Outputs:**
- Development: `dist/calendar-card-pro-dev.js` (with sourcemaps)
- Production: `dist/calendar-card-pro.js` (minified, no debug logging)

## Build Process

**Development Mode:**
```bash
npm run dev          # Rollup watch mode
NODE_ENV=dev npm run build
# Output: calendar-card-pro-dev.js (sourcemaps enabled, logging level 1+)
```

**Production Mode:**
```bash
cross-env NODE_ENV=prod npm run build
# Output: calendar-card-pro.js (minified via terser, logging level 0)
```

**Build Pipeline:**
1. TypeScript transpilation via esbuild (ES2017 target)
2. JSON imports processed
3. Version placeholder replaced with package.json version
4. Log level replaced (CURRENT_LOG_LEVEL: 1→0 for prod)
5. Component name de-suffixed (calendar-card-pro-dev→calendar-card-pro)
6. CommonJS compatibility layer applied
7. Node modules resolved
8. Code minified (production only)

## Development Tools

**Scripting:**
- `npm run dev` - Watch mode with live rebuild
- `npm run build` - Production bundle
- `npm run lint` - ESLint with auto-fix and stylish formatter
- `npm run format` - Prettier auto-formatting

**Code Quality:**
- TypeScript strict mode: `noImplicitAny: false`, `noUnusedParameters: true`, `noImplicitReturns: true`
- Import sorting with alphabetical order and grouping (builtin→external→internal→sibling→parent→index)
- Unused parameter rule: underscore prefix allowed (`argsIgnorePattern: '^_'`)
- No explicit any: `@typescript-eslint/no-explicit-any: 'error'`
- Prettier line width: 100 characters

## Path Aliases

Configured in `tsconfig.json`:
- `@config/*` → `src/config/*`
- `@translations/*` → `src/translations/*`
- `@utils/*` → `src/utils/*`
- `@rendering/*` → `src/rendering/*`

## Platform Requirements

**Development:**
- Node.js (npm compatible, tested with node modules)
- Git for version control (GitHub repository)

**Production:**
- Home Assistant 2023.1+ (frontend compatible)
- Modern browser with Web Components support (ES2017+)
- Home Assistant custom card loader (HACS compatible)

## Distribution

**Package:**
- Name: `calendar-card-pro-dev` (development), `calendar-card-pro` (production)
- Entry point: `dist/calendar-card-pro.js`
- Format: ES module (Rollup output format: 'es')
- Registration: HACS custom card via window.customCards

**License:**
- MIT (Apache 2.0 compatible code included from Home Assistant)

---

*Stack analysis: 2026-02-22*
