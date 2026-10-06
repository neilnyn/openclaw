import { describe, expect, it } from "vitest";
import {
  readChannelAccounts,
  readChannelRouteBindings,
  readAgentIds,
  resolveAccountAgent,
  writeAccountBindings,
} from "./view.routing.ts";

const configWith = (bindings: unknown[], accounts?: Record<string, unknown>) => ({
  bindings,
  agents: { entries: { main: {}, test: {} } },
  channels: {
    "dingtalk-connector": {
      accounts: accounts ?? { main: {}, "test-robot": {} },
    },
  },
});

describe("channel agent routing helpers", () => {
  it("lists explicit accounts and falls back to the implicit default", () => {
    expect(readChannelAccounts(configWith([]), "dingtalk-connector")).toEqual([
      "main",
      "test-robot",
    ]);
    expect(readChannelAccounts(configWith([], {}), "dingtalk-connector")).toEqual(["__default__"]);
    expect(readChannelAccounts(null, "dingtalk-connector")).toEqual(["__default__"]);
  });

  it("lists agent ids with a main fallback", () => {
    expect(readAgentIds(configWith([]))).toEqual(["main", "test"]);
    expect(readAgentIds({ agents: {} })).toEqual(["main"]);
    expect(readAgentIds(null)).toEqual(["main"]);
  });

  it("collects only account-level route bindings for the channel", () => {
    const bindings = [
      { agentId: "main", match: { channel: "dingtalk-connector", accountId: "*" } },
      { agentId: "x", match: { channel: "telegram", accountId: "*" } },
      { type: "acp", agentId: "y", match: { channel: "dingtalk-connector" } },
      {
        agentId: "z",
        match: { channel: "dingtalk-connector", peer: { kind: "direct", id: "p" } },
      },
    ];
    const collected = readChannelRouteBindings(configWith(bindings), "dingtalk-connector");
    expect(collected).toHaveLength(1);
    expect(collected[0]?.agentId).toBe("main");
  });

  it("resolves specific before wildcard", () => {
    const bindings = [
      { agentId: "main", match: { channel: "dingtalk-connector", accountId: "*" } },
      { agentId: "test", match: { channel: "dingtalk-connector", accountId: "test-robot" } },
    ];
    expect(resolveAccountAgent(bindings, "test-robot")).toEqual({
      agentId: "test",
      viaWildcard: false,
    });
    expect(resolveAccountAgent(bindings, "main")).toEqual({
      agentId: "main",
      viaWildcard: true,
    });
    expect(resolveAccountAgent(bindings, "unknown")).toEqual({
      agentId: "main",
      viaWildcard: true,
    });
  });

  it("writes bindings preserving foreign entries and wildcard order", () => {
    const foreign = [
      { agentId: "x", match: { channel: "telegram", accountId: "*" } },
      {
        agentId: "z",
        match: { channel: "dingtalk-connector", peer: { kind: "direct", id: "p" } },
      },
    ];
    const configValue = configWith([
      ...foreign,
      { agentId: "old", match: { channel: "dingtalk-connector", accountId: "main" } },
    ]);
    const next = writeAccountBindings({
      configValue,
      channelId: "dingtalk-connector",
      assignments: [
        { accountId: "main", agentId: "main" },
        { accountId: "test-robot", agentId: null },
        { accountId: "*", agentId: "test" },
      ],
    });
    expect(next).toHaveLength(4);
    // Foreign bindings survive untouched.
    expect(next.slice(0, 2)).toEqual(foreign);
    // Specific account bindings come before the wildcard catch-all.
    expect(next[2]).toEqual({
      agentId: "main",
      match: { channel: "dingtalk-connector", accountId: "main" },
    });
    expect(next[3]).toEqual({
      agentId: "test",
      match: { channel: "dingtalk-connector", accountId: "*" },
    });
  });
});
