import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { REDACTED_SENTINEL } from "../lib/config-form-utils.ts";
import type { JsonSchema } from "./config-form.shared.ts";
import { renderNode } from "./config-form.ts";

// Vault action: a locally typed plaintext secret can be moved to the store in
// place, while the server redaction sentinel routes through the server-side
// vault RPC (the UI cannot read that value) and SecretRef values offer nothing.

const channelSchema = {
  type: "object",
  properties: {
    channels: {
      type: "object",
      properties: {
        "dingtalk-connector": {
          type: "object",
          properties: {
            accounts: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  clientId: { type: "string" },
                  clientSecret: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
        },
      },
    },
  },
} as unknown as JsonSchema;

const hints = {
  "channels.dingtalk-connector.accounts.*.clientSecret": { sensitive: true },
};

const vaultSpy = vi.fn();
const storedVaultSpy = vi.fn();

function renderSecretField(container: HTMLElement, secretValue: unknown) {
  render(
    renderNode({
      schema: channelSchema,
      value: {
        channels: {
          "dingtalk-connector": {
            accounts: { "test-robot": { clientId: "dingxxx", clientSecret: secretValue } },
          },
        },
      },
      path: [],
      hints,
      unsupported: new Set<string>(),
      disabled: false,
      onPatch: () => {},
      onVaultSecret: (path, value) => {
        vaultSpy(path, value);
      },
      onVaultStoredSecret: (path) => {
        storedVaultSpy(path);
      },
    }),
    container,
  );
}

const findVaultButton = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
    button.textContent?.includes("vault"),
  );

describe("sensitive field vault action", () => {
  it("offers client-side vaulting for a locally typed plaintext secret", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderSecretField(container, "real-secret-value");
    await new Promise((resolve) => setTimeout(resolve, 25));
    const button = findVaultButton(container);
    expect(button, "vault button renders for typed plaintext").toBeTruthy();
    vaultSpy.mockClear();
    button!.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(vaultSpy).toHaveBeenCalledWith(
      ["channels", "dingtalk-connector", "accounts", "test-robot", "clientSecret"],
      "real-secret-value",
    );
    expect(storedVaultSpy).not.toHaveBeenCalled();
  });

  it("flags the sentinel state and routes vaulting through the server-side action", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderSecretField(container, REDACTED_SENTINEL);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const button = findVaultButton(container);
    expect(button, "vault button renders for sentinel-redacted plaintext").toBeTruthy();
    expect(container.textContent).toContain("Plaintext in config file");
    storedVaultSpy.mockClear();
    vaultSpy.mockClear();
    button!.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(storedVaultSpy).toHaveBeenCalledWith([
      "channels",
      "dingtalk-connector",
      "accounts",
      "test-robot",
      "clientSecret",
    ]);
    expect(vaultSpy).not.toHaveBeenCalled();
  });

  it("never offers vaulting for SecretRef values", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    renderSecretField(container, { source: "store", provider: "default", id: "X_SECRET" });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(findVaultButton(container)).toBeUndefined();
    expect(container.textContent).not.toContain("Plaintext in config file");
  });
});
