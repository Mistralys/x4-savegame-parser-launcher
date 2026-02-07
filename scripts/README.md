# Utility Scripts

This directory contains various utility scripts for the project.

## Project Manifest Merger (`merge-manifests.js`)

This script is used to combine all project manifest documents from `Docs/Agents/ProjectManifest/` into a single, cohesive Markdown file. This is particularly useful for uploading the entire project manifest to AI tools like NotebookLM as a single source of truth.

### Key Features

- **Consolidation**: Merges `README.md` and all other manifest documents into one file.
- **Header Shifting**: Automatically increases the level of all headers in the source files (e.g., `# Header` becomes `## Header`) to maintain a correct hierarchical structure in the combined document.
- **Internal Link Conversion**: Automatically transforms relative file links (e.g., `[Tech Stack](./tech-stack.md)`) into internal jump marks (anchors) like `[Tech Stack](#techstackmd)`.
- **Anchors**: Injects `<a name="..."></a>` anchors at the start of each file's section for easy navigation.

### Usage

To run the script and generate the combined manifest, execute the following command from the project root:

```bash
node scripts/merge-manifests.js
```

The script will generate a file named `X4-Savegame-Parser-Launcher-Manifest.md` in the project root.

### Requirements

- [Node.js](https://nodejs.org/) installed on your system.
- No additional dependencies are required as the script uses standard Node.js `fs` and `path` modules.
