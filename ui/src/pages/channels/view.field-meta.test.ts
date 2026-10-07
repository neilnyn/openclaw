import { describe, expect, it } from "vitest";
import { splitConfigSchemaByTier } from "../../components/config-form.tiers.ts";
import { hintForPath } from "../../lib/config-form-utils.ts";
import { withChannelFieldHints } from "./view.config.ts";

// The curated field dictionary must flow through the ordinary hint machinery:
// concrete-path overrides for label/order, preserved server flags, and tier
// folding for low-frequency fields.

const channelId = "dingtalk-connector";

describe("withChannelFieldHints", () => {
  it("overrides presentation keys while preserving server flags", () => {
    const hints = withChannelFieldHints(
      {
        [`channels.${channelId}.accounts.*.clientSecret`]: {
          sensitive: true,
        },
      },
      channelId,
    );
    const secret = hintForPath(
      ["channels", channelId, "accounts", "test02", "clientSecret"],
      hints,
    );
    expect(secret?.sensitive).toBe(true);
    expect(secret?.advanced).toBe(false);
    expect(secret?.label).toContain("Client Secret");
    expect(secret?.help).toBeTruthy();
    expect(secret?.order).toBe(11);
  });

  it("applies the same vocabulary inside account entries", () => {
    const hints = withChannelFieldHints({}, channelId);
    const dmPolicy = hintForPath(["channels", channelId, "accounts", "main", "dmPolicy"], hints);
    expect(dmPolicy?.order).toBe(20);
    expect(dmPolicy?.label).toBeTruthy();
  });

  it("folds low-frequency fields into the advanced tier", () => {
    const hints = withChannelFieldHints({}, channelId);
    const channelSchema = {
      type: "object",
      properties: {
        clientId: { type: "string" },
        dmPolicy: { type: "string" },
        ackText: { type: "string" },
        asyncMode: { type: "boolean" },
      },
    };
    const split = splitConfigSchemaByTier({
      schema: channelSchema,
      path: ["channels", channelId],
      hints,
    });
    const commonKeys = Object.keys(split.common?.properties ?? {});
    const advancedKeys = Object.keys(split.advanced?.properties ?? {});
    expect(commonKeys).toContain("clientId");
    expect(commonKeys).toContain("dmPolicy");
    expect(commonKeys).not.toContain("ackText");
    expect(advancedKeys).toContain("ackText");
    expect(advancedKeys).toContain("asyncMode");
  });

  it("orders credentials before admission controls", () => {
    const hints = withChannelFieldHints({}, channelId);
    const orderOf = (field: string) =>
      hintForPath(["channels", channelId, field], hints)?.order ?? 0;
    expect(orderOf("enabled")).toBeLessThan(orderOf("clientId"));
    expect(orderOf("clientId")).toBeLessThan(orderOf("clientSecret"));
    expect(orderOf("clientSecret")).toBeLessThan(orderOf("dmPolicy"));
    expect(orderOf("dmPolicy")).toBeLessThan(orderOf("tools"));
  });
});
