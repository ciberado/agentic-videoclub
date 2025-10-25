# Copilot Instructions for AI Coding Agents

## Project Overview
This monorepo is organized under `packages/`, with each subfolder representing a distinct module or service. The current main package is `template`, which uses TypeScript and Jest for development and testing.

## Architecture & Structure
- **Monorepo Layout:** All code is under `packages/`. Each package is self-contained with its own `package.json` and TypeScript config.
- **TypeScript:** All source code is written in TypeScript. Shared configuration is in the root `tsconfig.json`; package-specific overrides are in each package's `tsconfig.json`.
- **Testing:** Jest is used for unit tests. Each package has its own `jest.config.js`.

## Developer Workflows
- **Install dependencies:**
  ```bash
  npm install
  ```
- **Build all packages:**
  ```bash
  npm run build
  ```
- **Test all packages:**
  ```bash
  npm test
  ```
- **Linting:**
  ```bash
  npm run lint
  ```
- **Formatting:**
  ```bash
  npm run format
  ```
- **Commit conventions:**
  - Uses `commitlint` and Husky for commit message enforcement. See `commitlint.config.js` and `.husky/`.

## Project-Specific Conventions
- **No direct source folder:** Source files are placed directly in each package root unless otherwise specified.
- **Config files:** Each package manages its own configs (`jest.config.js`, `tsconfig.json`, etc.).
- **No README.md found:** Document new patterns in `.github/copilot-instructions.md` until a README is added.

## Integration Points & Dependencies
- **Jest:** For testing, see `packages/template/jest.config.js`.
- **TypeScript:** See `tsconfig.json` in both root and packages.
- **Linting/Formatting:** Controlled by `.eslintrc.json`, `.prettierrc`, and related files in the root.
- **Commit hooks:** Managed by Husky in `.husky/`.

## Examples
- To add a new package, create a folder under `packages/` with its own `package.json` and configs.
- To run tests for a specific package:
  ```bash
  cd packages/template
  npm test
  ```

## Key Files & Directories
- `packages/` — All code modules
- `packages/template/` — Example package
- `.github/copilot-instructions.md` — AI agent instructions
- `.husky/` — Git hooks
- `.eslintrc.json`, `.prettierrc` — Lint/format configs
- `commitlint.config.js` — Commit message rules

---
If any conventions or workflows are unclear, please request clarification or provide examples to improve this guide.