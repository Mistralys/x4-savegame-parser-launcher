# File Tree

```text
.
├── .github/
│   └── workflows/
├── .gitignore
├── Docs/
│   └── Agents/
│       ├── ImplementationArchive/
│       │   ├── 1-initial-implementation-plan.md
│       │   ├── 2-application-concept.md
│       │   ├── 3-initial-work-packages.md
│       │   ├── 4-config-editing.md
│       │   ├── 5-release-automation-master.md
│       │   ├── 5-release-automation/
│       │   │   ├── wp1-testing-infrastructure.md
│       │   │   ├── wp2-project-prep.md
│       │   │   └── wp3-github-action.md
│       │   ├── 6-api-implementation-plan.md
│       │   ├── 7-extraction-management.md
│       │   └── README.md
│       └── ProjectManifest/
│           ├── README.md
│           ├── tech-stack.md
│           ├── file-tree.md
│           ├── public-api.md
│           ├── constraints.md
│           ├── data-flows.md
│           ├── database-cli-api-reference.md
│           ├── detail-screens.md
│           └── monitor-ndjson-reference.md
├── index.html
├── LICENSE
├── package-lock.json
├── package.json
├── plans/
│   ├── api-migration-logbook.md
│   ├── detail-screens-navigation.md
│   ├── installation-improvement.md
│   ├── logbook-screen.md
│   └── owned-ships-screen.md
├── public/
│   ├── tauri.svg
│   └── vite.svg
├── README.md
├── scripts/
│   ├── merge-manifests.js
│   └── README.md
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── assets/
│   │   └── react.svg
│   ├── components/
│   │   ├── BlockingModal.tsx
│   │   ├── DataPagination.tsx
│   │   ├── DataTable.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── LogbookView.tsx
│   │   ├── LogViewer.tsx
│   │   ├── OwnedShipsView.tsx
│   │   ├── SaveDataViewer.tsx
│   │   ├── SaveSelector.tsx
│   │   ├── SettingsView.tsx
│   │   ├── ShipLossesView.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ToolView.tsx
│   │   └── WindowControls.tsx
│   ├── context/
│   │   ├── ConfigContext.tsx
│   │   ├── ErrorContext.tsx
│   │   ├── I18nContext.tsx
│   │   ├── NotificationContext.tsx
│   │   ├── ProcessContext.tsx
│   │   ├── ThemeContext.test.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ValidationContext.tsx
│   ├── hooks/
│   │   ├── useSaveData.ts
│   │   └── useTheme.ts
│   ├── locales/
│   │   ├── de.json
│   │   ├── en.json
│   │   └── fr.json
│   ├── services/
│   │   ├── logger.test.ts
│   │   └── logger.ts
│   ├── test/
│   │   └── setup.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── src-tauri/
│   ├── build.rs
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── capabilities/
│   │   └── default.json
│   ├── gen/
│   ├── icons/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── main.rs
│   │   └── process.rs
│   └── tauri.conf.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── changelog.md
└── AGENTS.md
```
