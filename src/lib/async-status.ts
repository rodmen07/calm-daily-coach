export type AsyncStatus =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };
