// Placeholder for future script SDK types and limited API surface.
export type ScriptContext = {
  objectId: string;
  sceneId: string;
  // future: limited capabilities
};

export type ScriptModule = {
  onInit?(ctx: ScriptContext): void | Promise<void>;
  onEvent?(ctx: ScriptContext, event: { type: string; payload?: unknown }): void | Promise<void>;
  onTick?(ctx: ScriptContext, dtMs: number): void | Promise<void>;
};


