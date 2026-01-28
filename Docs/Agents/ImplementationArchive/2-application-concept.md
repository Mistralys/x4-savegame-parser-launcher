# Application Concept

## Purpose

The application is intended to be used as a launcher for a PHP-based tool 
that I use for the video game X4: Foundations. The tool hasy two CLI
endpoints that have to be started, and the launcher will be used to
start them from a convenient interface, as well as to display the
CLI output from both scripts.

Since we already have a sidebar, each tool should have its own tab there
to switch between them, and to launch / view their output.

### Main Tabs

1. **The Parser** 
    - Primary roles:
        - Launch/stop the script
        - Display the CLI output
2. **The Viewer**: 
    - Primary roles:
        - Launch/stop the script
        - Open a Web browser to the HTTP server
    - Secondary roles:
        - Display the CLI output
3. **Configuration**
    - Path to the X4: Foundations game folder
    - Path to the savegame folder
    - Path to the savegame parser tool

## Design Principles

### Localization

All texts in the application should be translatable.

- Invariant language: English (International)
- Entirely configuration-less: No code changes should be necessary to add new languages.
- Proposed format: JSON translation files that contain language properties and translated texts.
- Starting translations: French and German (good for testing UI elements)
- Enable support for Chinese and Japanese (in the future).

## Background: The X4 Savegame Parser

The savegame parser tool has two components that are run on the command line: 

### The Parser

This is a highly specialized tool that parses the game's      
notoriously big XML files (often bigger than 2GB). It's a CLI
tool that you start, and which then monitors file system changes
in the game's savegame folder.

New savegames are parsed automatically into smaller chunks, and
their data extracted. They are also backed up, as the game has
an autosave rotation in place that would overwrite existing
autosaves after a while.

### The Viewer

This is a custom HTTP server implementation that can be started
on the command line to access a web interface to view information
on all known savegames, and to display all data extracted from
individual savegames.

This data contains useful information, from owned ships to
the construction blueprints available to the player, and which
ones are still left to unlock.

