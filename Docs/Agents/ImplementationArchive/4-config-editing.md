# Configuration Editing

The savegame parser package uses a JSON-based configuration. It is located
here:

`{INSTALL_PATH}/config.json`

> NOTE: {INSTALL_PATH} is where the savegame parser package has been installed
> (as set in the app's settings).

## JSON Structure

```json
{
  "gameFolder": "C:\\Users\\Someone\\Documents\\Egosoft\\X4\\11111111",
  "storageFolder": "archived-saves",
  "viewerHost": "localhost",
  "viewerPort": 9494,
  "autoBackupEnabled": true,
  "keepXMLFiles": false,
  "loggingEnabled": false
}
```

## Implementation Plan

### 1. Adding Necessary Settings

All settings from the configuration must be available in the app's settings
tab. Here are explanations of the settings:

- `gameFolder` (string): Path to X4 documents folder (Already implemented as the savegame folder)
- `storageFolder` (string): Path to store extracted data, relative to `gameFolder`
- `viewerHost` (string): Hostname for UI server (Already implemented)
- `viewerPort` (int): Port for UI server (Already implemented)
- `autoBackupEnabled` (bool): Enable auto backups
- `keepXMLFiles` (bool): Keep extracted XML files
- `loggingEnabled` (bool): Enable verbose viewer logging

### 2. Generating The Config

Whenever the user modifies settings, the JSON configuration file in the savegame 
parser folder must be updated (and created as necessary if it does not exist).
Provided that the folder has been set and is valid, of course. Otherwise, It
can be silently ignored.

