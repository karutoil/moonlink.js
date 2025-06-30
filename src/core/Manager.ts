import { EventEmitter } from "node:events";
import {
  IEvents,
  IVoiceState,
  IConfigManager,
  IOptionsManager,
  IPlayerConfig
} from "../typings/Interfaces";
import { TSearchSources } from "../typings/types";
import {
  Log,
  Structure,
  Database,
  NodeManager,
  PlayerManager,
  SourceManager,
  Player,
  validateProperty,
  SearchResult,
  compareVersions
} from "../../index";

export declare interface Manager {
  on<K extends keyof IEvents>(event: K, listener: IEvents[K]): this;
  once<K extends keyof IEvents>(event: K, listener: IEvents[K]): this;
  emit<K extends keyof IEvents>(event: K, ...args: Parameters<IEvents[K]>): boolean;
  off<K extends keyof IEvents>(event: K, listener: IEvents[K]): this;
}

/**
 * The main Manager class for Moonlink.js
 * 
 * This is the entry point for the Moonlink.js library. It manages connections to Lavalink nodes,
 * handles players across multiple guilds, and provides the main API for music functionality.
 * 
 * @example
 * ```typescript
 * import { Manager } from 'moonlink.js';
 * 
 * const manager = new Manager({
 *   nodes: [{
 *     host: 'localhost',
 *     port: 2333,
 *     password: 'youshallnotpass'
 *   }],
 *   sendPayload: (guildId, payload) => {
 *     // Send payload to Discord
 *   }
 * });
 * 
 * // Initialize the manager
 * manager.init();
 * ```
 */
export class Manager extends EventEmitter {
  /** Whether the manager has been initialized */
  public initialize: boolean = false;
  
  /** Manager configuration options */
  public readonly options: IOptionsManager;
  
  /** Function to send payloads to Discord */
  public readonly sendPayload: Function;
  
  /** Node manager instance for handling Lavalink connections */
  public nodes: NodeManager;
  
  /** Player manager instance for handling guild players */
  public players: PlayerManager = new (Structure.get("PlayerManager"))(this);
  
  /** Current version of Moonlink.js */
  public version: string = require("../../index").version;
  
  /** Database instance for persistent storage */
  public database: Database;
  
  /** Source manager for handling different music sources */
  public sources: SourceManager;
  
  /**
   * Creates a new Manager instance
   * 
   * @param config - Configuration object for the manager
   */
  constructor(config: IConfigManager) {
    super();
    this.sendPayload = config?.sendPayload;
    this.options = {
      clientName: `Moonlink.js/${this.version} (https://github.com/Ecliptia/moonlink.js)`,
      defaultPlatformSearch: "youtube",
      NodeLinkFeatures: false,
      previousInArray: false,
      logFile: { path: undefined, log: false },
      movePlayersOnReconnect: false,
      sortPlayersByRegion: false,
      resume: false,
      autoResume: false,
      disableDatabase: false,
      ...config.options,
    };
    this.nodes = new (Structure.get("NodeManager"))(this, config.nodes);
    
    if (this.options.plugins) {
      if (this.options.plugins) {
        this.options.plugins.forEach(plugin => {
          if (plugin.minVersion && compareVersions(this.version, plugin.minVersion) < 0) {
            throw new Error(
              `Moonlink.js > Plugin ${plugin.name || "unknown"} requires at least version ${plugin.minVersion}. Current version: ${this.version}`
            );
          }
          plugin.load(this);
        });
      }
    }
  }
  public init(clientId: string): void {
    if (this.initialize) return;
    if (this.options.logFile?.log) {
      validateProperty(
        this.options.logFile?.path,
        value => value !== undefined || typeof value !== "string",
        "Moonlink.js > Options > A path to save the log was not provided"
      );
      this.on("debug", (message: string) => Log(message, this.options.logFile?.path));
    }
    Structure.manager = this;
    this.options.clientId = clientId;
    this.database = new (Structure.get("Database"))(this);
    this.sources = new (Structure.get("SourceManager"))(this);
    this.nodes.init();
    this.initialize = true;
    this.emit("debug", "Moonlink.js > initialized with clientId(" + clientId + "), ready to go!");
    this.emit("debug", "Moonlink.js > Version: " + this.version);
    //@ts-ignore
    this.emit("debug", "Moonlink.js > environment: " + (typeof globalThis.Deno !== "undefined" ? "Deno" : typeof globalThis.bun !== "undefined" ? "Bun" : "Node.js") + "; version: " + (typeof globalThis.Deno !== "undefined" ? Deno.version.deno : typeof globalThis.bun !== "undefined" ? (Bun.version) : process.version));
  }
  public async search(options: {
    query: string;
    source?: TSearchSources;
    node?: string;
    requester?: unknown;
  }): Promise<SearchResult> {
    return new Promise(async resolve => {
      validateProperty(
        options,
        value => value !== undefined,
        "(Moonlink.js) - Manager > Search > Options is required"
      );
      validateProperty(
        options.query,
        value => typeof value === "string",
        "(Moonlink.js) - Manager > Search > Query is required"
      );
  
      const query = options.query;
      const sourceName = options.source ?? this.options.defaultPlatformSearch;
      const [ matched, sourceMatched ] = this.sources.isLinkMatch(query, sourceName)
      if (!this.options.disableNativeSources && matched) {
        const nativeSource = this.sources.get(sourceMatched)!;
        if (nativeSource) {
          const data = await nativeSource.load(query, options);
          return resolve(new (Structure.get("SearchResult"))(data, options));
        }
      }
  
      if (
        !this.options.disableNativeSources &&
        this.sources.has(sourceName)
      ) {
        const nativeSource = this.sources.get(sourceName)!;
        const data = await nativeSource.search(query, options);
        return resolve(new (Structure.get("SearchResult"))(data, options));
      }
  
      const available = [...this.nodes.cache.values()].filter(n => n.connected);
      if (available.length === 0) {
        throw new Error("No available nodes to search from.");
      }
  
      const node = options.node && this.nodes.cache.has(options.node)
        ? this.nodes.get(options.node)!
        : this.nodes.best;
  
      const data = await node.rest.loadTracks(sourceName, query);
      return resolve(new (Structure.get("SearchResult"))(data, options));
    });
  }
  
  public async packetUpdate(packet: any): Promise<void> {
    if (!["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(packet.t)) return;

    if (!packet.d.token && !packet.d.session_id) return;

    const player = this.getPlayer(packet.d.guild_id);
    if (!player) return;

    if (!player.voiceState) player.voiceState = {};

    if (packet.t === "VOICE_SERVER_UPDATE") {
      player.voiceState.token = packet.d.token;
      player.voiceState.endpoint = packet.d.endpoint;

      if (packet.d.endpoint) {
        const match = packet.d.endpoint.match(/^([a-z-]+)[0-9]*\.discord\.media/i);
        if (match) {
          const region = match[1];
          player.region = region;
          this.emit(
            "debug",
            `Moonlink.js > Updated region (${region}) for guild ${player.guildId}`
          );
          if (this.options.sortPlayersByRegion && !player.node.regions.includes(region)) {
            let hasNode = [...this.nodes.cache.values()].some(node =>
              node.regions.includes(region)
            );
            if (hasNode) {
              let newNode = [...this.nodes.cache.values()].find(node =>
                node.regions.includes(region)
              );

              this.emit(
                "debug",
                `Moonlink.js > Moved player from ${player.node.uuid} to ${newNode.uuid}`
              );

              player.node = newNode;
            }
          }
        }
      }

      this.emit("debug", `Moonlink.js > Received voice server update for guild ${player.guildId}`);
      await this.attemptConnection(player.guildId);
    } else if (packet.t === "VOICE_STATE_UPDATE") {
      if (packet.d.user_id !== this.options.clientId) return;

      if (!packet.d.channel_id) {
        player.connected = false;
        player.playing = false;
        player.voiceChannelId = null;
        player.voiceState = {};

        this.emit("playerDisconnected", player);
        this.emit("debug", "Moonlink.js > Is disconnected from guild " + player.guildId);
        return;
      }

      if (packet.d.channel_id !== player.voiceChannelId) {
        this.emit("playerMoved", player, player.voiceChannelId, packet.d.channel_id);
        this.emit(
          "debug",
          `Moonlink.js > Moved to channel ${packet.d.channel_id} in guild ${player.guildId}`
        );
        player.voiceChannelId = packet.d.channel_id;
      }

      player.voiceState.sessionId = packet.d.session_id;

      this.emit("debug", `Moonlink.js > Received voice state update for guild ${player.guildId}`);
      await this.attemptConnection(player.guildId);
    }
  }

  public async attemptConnection(guildId: string): Promise<boolean> {
    const player = this.getPlayer(guildId);
    if (!player) return;

    const voiceState: IVoiceState = player.voiceState;

    if (!voiceState.token || !voiceState.sessionId || !voiceState.endpoint) {
      this.emit("debug", `Moonlink.js > Missing voice server data for guild ${guildId}, wait...`);
      return false;
    }

    let attempts: any = await player.node.rest.update({
      guildId,
      data: {
        voice: {
          sessionId: voiceState.sessionId,
          token: voiceState.token,
          endpoint: voiceState.endpoint,
        },
      },
    });

    this.emit(
      "debug",
      `Moonlink.js > Attempting to connect to ${
        player.node.identifier ?? player.node.host
      } for guild ${guildId}`
    );

    if (attempts) player.voiceState.attempt = true;
    return true;
  }

  /**
   * @deprecated Use players.create() instead
   */
  public createPlayer(config: IPlayerConfig): Player {
    return this.players.create(config);
  }
  /**
   * @deprecated Use players.get() instead
   */ 
  public getPlayer(guildId: string): Player {
    return this.players.get(guildId);
  }
  /**
   * @deprecated Use players.has() instead
   */
  public hasPlayer(guildId: string): boolean {
    return this.players.has(guildId);
  }
  /**
   * @deprecated Use players.delete() instead
   */
  public deletePlayer(guildId: string): boolean {
    this.players.delete(guildId);
    return true;
  }

  public getAllPlayers(): Map<string, Player> {
    return this.players.cache;
  }
}
