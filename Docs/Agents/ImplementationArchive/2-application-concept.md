# Application Concept - X4 Savegame Parser Launcher

## Purpose

The application is a desktop launcher for a set of PHP-based tools used with the video game X4: Foundations. It provides a convenient graphical interface to start, stop, and monitor these tools without interacting with the command line.

The launcher manages two primary tools:
1.  **The Parser**: Monitors and processes large game save files.
2.  **The Viewer**: A local web server for exploring extracted game data.

## Key Features

### Tool Management
- **One-Click Operation**: Easily start and stop the Parser and Viewer tools from dedicated tabs.
- **Real-Time Monitoring**: View the live output (logs) from each tool directly within the application.
- **Automated Cleanup**: The application ensures all background tools are safely shut down when the launcher is closed.

### Configuration & Health
- **Flexible Setup**: Configure paths for the PHP executable, the game folders, and the tool scripts via a dedicated Settings tab.
- **Smart Validation**: The application continuously monitors the configured paths. If a folder is moved or a script becomes unavailable, the launcher will immediately alert the user.
- **Operational Safety**: To prevent errors, tool controls are automatically disabled if the required configuration is invalid, guiding the user to fix the issue via a helpful overlay.

### User Experience
- **Localization**: Full support for English, French, and German, with a design that allows for easy addition of more languages in the future.
- **Theme Support**: Includes light and dark modes to match user preference.
- **Robust Error Handling**: If something goes wrong, the app provides clear notifications while maintaining detailed background logs for easier troubleshooting and support.

## Design Principles

### Localization
- **Invariant language**: English (International)
- **Configuration-less**: No code changes are necessary to add new languages.
- **Format**: JSON translation files for easy community contributions.
- **Initial Languages**: English, French, German.

### Reliability
- **Continuous Validation**: The app periodically checks the environment (every 5 seconds) to stay in sync with the file system.
- **Session Logging**: Each session generates a fresh debug log, making it easy for users to report issues with full context.

## Background: The X4 Savegame Parser

The savegame parser tool consists of two components:

### The Parser
A specialized tool that parses notoriously large XML files (often >2GB). It monitors the game's savegame folder, automatically extracts data from new saves, and creates backups to prevent them from being overwritten by the game's auto-save rotation.

### The Viewer
A custom HTTP server that provides a web interface to view the information extracted by the Parser. This includes detailed data on owned ships, construction blueprints, and player progress.
