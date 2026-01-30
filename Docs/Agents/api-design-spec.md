# CLI JSON API Specification: Requirements for Implementation

This document outlines the technical requirements for the PHP-based CLI JSON API. This API will serve as the data provider for the integrated viewer in the Tauri application.

## 1. Output Requirements

### Strict JSON Mode
- **Requirement**: When the `--json` flag is provided, the **entire** output to `STDOUT` must be a single, valid JSON object.
- **Constraint**: No headers, footers, or progress logs should be printed to `STDOUT` in JSON mode. All logging/debugging must be redirected to `STDERR` or suppressed.
- **Reasoning**: The Tauri `Command` wrapper in Rust needs to parse the output directly. Any non-JSON characters will break the parser.

### Performance
- **Requirement**: The API should utilize the pre-parsed data cache (from the Parser tool) rather than re-parsing the XML savegame on every request.
- **Reasoning**: Real-time XML parsing is too slow for UI interactions.

## 2. Capability Requirements (Filtering & Paging)

### Pagination
- **Parameters**: `--limit=[int]` and `--offset=[int]`.
- **Requirement**: All list-based actions (ships, stations, logs) **must** support pagination.
- **Default Limit**: 50 or 100 records.

### Filtering
- **Parameters**: 
  - `--faction=[id]` (e.g., `argon`, `player`)
  - `--class=[id]` (e.g., `ship_s`, `ship_l`)
  - `--search=[string]` (partial match on name or ID)
- **Requirement**: Filtering must happen **before** pagination is applied.

### Data Aggregation
- **Requirement**: Provide a "summary" action that returns counts of entities (e.g., "Total Ships: 450") to help the UI set up pagination controls.

## 3. Data Schema Guidelines

### Flattened Structures
- **Requirement**: Prefer shallow/flat JSON objects over deeply nested ones.
- **Example**: Instead of `ship.properties.hull.value`, use `ship.hull_current`.
- **Reasoning**: Improves performance in React's rendering cycle and simplifies state management.

### Consistent Formatting
- **Requirement**: Use `camelCase` for JSON keys to match TypeScript/React conventions.
- **Requirement**: Use ISO 8601 strings for timestamps.

## 4. Error Handling

### Structured Errors
- **Requirement**: If an error occurs, return a JSON object with `error: true` and a descriptive message.
- **Schema**:
  ```json
  {
    "status": "error",
    "message": "Savegame not found",
    "code": 404
  }
  ```

## 5. Interface Definition (Example Commands)

| Action | Flags | Description |
| :--- | :--- | :--- |
| `get-summary` | `--json` | Overview of the save (player name, credits, counts). |
| `get-ships` | `--faction`, `--class`, `--limit`, `--offset` | Detailed list of ships. |
| `get-factions` | `--json` | List of all factions and their relations. |
| `get-sectors` | `--json` | List of sectors for map rendering. |

## 7. Command Syntax Philosophy

- **Explicit over Shorthand**: Avoid command aliases (e.g., `ships-argon`). Always use explicit actions and parameters.
- **Reasoning**: The Launcher (Tauri) is a programmatic consumer. It is more robust for the Launcher to construct queries from building blocks than to rely on hardcoded aliases in the API. This ensures the API remains flexible as new filter requirements emerge.

## 6. Standard Response Envelope

To ensure consistent handling in the React frontend, **all** responses must follow a standard envelope structure, even if the payload varies in shape.

### Envelope Schema
```json
{
  "version": "1.0.0",
  "status": "success|error",
  "action": "get-ships",
  "meta": {
    "totalCount": 1200,    // For list-based actions
    "limit": 50,           // For list-based actions
    "offset": 0            // For list-based actions
  },
  "data": {} | []          // The actual payload
}
```

### Shape Consistency
- **Lists**: `data` must be an **Array of Objects**.
- **Summaries/Stats**: `data` must be an **Object**.
- **Empty States**: If no results are found for a list, `data` should be `[]` (not `null`).

### Reasoning
A consistent envelope allows the Tauri/React layers to implement a unified data fetching service that handles version checking, error propagation, and pagination metadata in a single place.
