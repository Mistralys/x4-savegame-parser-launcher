# Agent OS - X4 Savegame Monitor & Launcher

## 📚 Project Manifest - Start Here!
The Project Manifest is the authoritative source of truth for this repository. If the implementation code conflicts with the manifest, the code is likely incorrect or requires a documentation update.

### 🎯 Location
`Docs/Agents/ProjectManifest/`

### 📖 Manifest Documents
1. [`README.md`](Docs/Agents/ProjectManifest/README.md) - High-level overview and manifest entry point.
2. [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) - Frontend (React/TS), Backend (Rust/Tauri), and architectural patterns.
3. [`file-tree.md`](Docs/Agents/ProjectManifest/file-tree.md) - Recursive structure of the project.
4. [`public-api.md`](Docs/Agents/ProjectManifest/public-api.md) - Tauri commands and IPC signatures.
5. [`constraints.md`](Docs/Agents/ProjectManifest/constraints.md) - Critical development and architectural rules.
6. [`data-flows.md`](Docs/Agents/ProjectManifest/data-flows.md) - Interaction between UI, Tauri, and external PHP tools.

## 🚀 Quick Start Workflow
New agents should follow this ingestion path to minimize token waste and maximize architectural alignment:

1. **Step 1: Manifest Ingestion**
   Read [`Docs/Agents/ProjectManifest/README.md`](Docs/Agents/ProjectManifest/README.md) to understand the project's scope.
2. **Step 2: Architecture Deep Dive**
   Consult [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) and [`constraints.md`](Docs/Agents/ProjectManifest/constraints.md) to understand the "How" and "What Not To Do".
3. **Step 3: Semantic Context Sync**
   Perform a semantic search for core architectural components (e.g., "Tauri command handling", "React state management") to align the search index with the Manifest's definitions.
4. **Step 4: Signature Verification**
   Check [`public-api.md`](Docs/Agents/ProjectManifest/public-api.md) before calling or modifying Tauri commands.
5. **Step 5: Implementation**
   Use semantic search to find specific files based on the [`file-tree.md`](Docs/Agents/ProjectManifest/file-tree.md) map.

## 📝 Manifest Maintenance Rules
Agents are responsible for keeping the manifest synchronized with the codebase.

| Change Made | Documents to Update |
|-------------|---------------------|
| Add/Modify Tauri Command | [`public-api.md`](Docs/Agents/ProjectManifest/public-api.md) |
| Add New React Context/Hook | [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) |
| Change Directory Structure | [`file-tree.md`](Docs/Agents/ProjectManifest/file-tree.md) |
| Add New Dependency | [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) |
| Implement New Screen/Flow | [`data-flows.md`](Docs/Agents/ProjectManifest/data-flows.md), [`detail-screens.md`](Docs/Agents/ProjectManifest/detail-screens.md) |
| Update Build/Deploy Logic | [`constraints.md`](Docs/Agents/ProjectManifest/constraints.md) |

## ⚡ Efficiency Rules (Search Smart)
* **High-Level Intent:** Consult the Manifest FIRST to understand the "Source of Truth" patterns.
* **Locating Implementation:** Use **Semantic Search (Codebase Search)** to find existing examples of patterns described in the manifest.
* **Semantic Query Tip:** When searching, use terms from [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) or [`constraints.md`](Docs/Agents/ProjectManifest/constraints.md) to find compliant code (e.g., "Find usage of ErrorContext in Tauri commands").
* **File Discovery:** Always consult [`file-tree.md`](Docs/Agents/ProjectManifest/file-tree.md) first. Do not use `list_files` recursively unless the tree is proven outdated.
* **Command Signatures:** Reference [`public-api.md`](Docs/Agents/ProjectManifest/public-api.md) to avoid reading `lib.rs` or `main.rs` for parameter names.
* **Avoid Brute Force:** Do not use `list_files` recursively or `grep` across the whole project. Use the semantic index to jump directly to relevant modules.
* **Context Awareness:** Check `Docs/Agents/ImplementationArchive/` if you need to understand the historical context of a specific feature.

## 🚨 Failure Protocol & Decision Matrix
| Scenario | Action | Priority |
|----------|--------|----------|
| Ambiguous Requirement | Use the most restrictive interpretation or ask for clarification. | **MUST** |
| Manifest/Code Conflict | Trust the manifest. Flag the code for correction or update the manifest if the code change was intentional. | **MUST** |
| **Search/Manifest Conflict** | If semantic search finds code that violates [`constraints.md`](Docs/Agents/ProjectManifest/constraints.md), **trust the constraints**. Report the non-compliant code. | **CRITICAL** |
| Compiler Error (`cargo check/clippy`) | Treat as an **Architectural Veto**. The compiler's requirements take precedence over even the manifest. Fix the error before proceeding. | **CRITICAL** |
| Missing Documentation | Do not proceed with assumptions. Create the missing manifest entry first. | **SHOULD** |
| **Finding Examples** | Use semantic search to find "Compliant Examples" of a pattern defined in the manifest. | **SHOULD** |
| Unexpected Error | Check [`ErrorContext`](src/context/ErrorContext.tsx) implementation and [`logger.ts`](src/services/logger.ts) patterns. | **MUST** |
| Unfamiliar Pattern | Cross-reference with [`tech-stack.md`](Docs/Agents/ProjectManifest/tech-stack.md) before refactoring. | **MUST** |
| Testing Failure | Consult [`vitest.config.ts`](vitest.config.ts) and [`src/test/setup.ts`](src/test/setup.ts) before modifying tests. | **MUST** |
