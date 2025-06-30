# API Reference

Welcome to the Moonlink.js API Reference! This documentation is automatically generated from the source code comments and provides comprehensive information about all classes, interfaces, types, and methods available in the library.

## Getting Started

The API reference is organized into the following sections:

- **Classes** - Main classes like Manager, Player, Node, etc.
- **Interfaces** - TypeScript interfaces for configuration and data structures
- **Types** - Type definitions and aliases
- **Enums** - Enumerated values used throughout the library

## Main Classes

### Core Classes
- **Manager** - The main entry point for Moonlink.js
- **Player** - Handles audio playback for a guild
- **Node** - Represents a Lavalink server connection
- **Queue** - Manages the track queue for a player

### Management Classes
- **NodeManager** - Manages multiple Lavalink nodes
- **PlayerManager** - Manages multiple players across guilds
- **SourceManager** - Handles different music sources

### Utility Classes
- **Track** - Represents an audio track
- **Filters** - Audio filters and effects
- **SearchResult** - Search results from music sources

## Quick Examples

```typescript
import { Manager } from 'moonlink.js';

// Create a new manager instance
const manager = new Manager({
  nodes: [{
    host: 'localhost',
    port: 2333,
    password: 'youshallnotpass'
  }]
});

// Create a player
const player = manager.players.create({
  guildId: 'your-guild-id',
  voiceChannelId: 'voice-channel-id',
  textChannelId: 'text-channel-id'
});

// Search for tracks
const result = await manager.search('your search query');
```

::: tip
This documentation is automatically updated whenever changes are made to the source code. Always refer to this for the most up-to-date API information.
:::

::: warning
This is an auto-generated documentation. For getting started guides and tutorials, please refer to the [Getting Started](/getting-started) section.
:::
