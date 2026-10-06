// Control UI view renders per-account agent routing for channel detail pages.
import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type { ChannelsProps } from "./view.types.ts";

// Mirrors the runtime wildcard for "every account on the channel".
const WILDCARD_ACCOUNT = "*";
// Implicit account id channels fall back to when no explicit accounts exist.
const IMPLICIT_ACCOUNT_ID = "__default__";

type RouteBinding = {
  type?: string;
  agentId?: string;
  comment?: string;
  match?: {
    channel?: string;
    accountId?: string;
    peer?: unknown;
    guildId?: string;
    teamId?: string;
    roles?: string[];
  };
  session?: unknown;
  acp?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Account ids configured for the channel; the implicit default when none. */
export function readChannelAccounts(
  configValue: Record<string, unknown> | null,
  channelId: string,
): string[] {
  const channels = isRecord(configValue?.channels) ? configValue.channels : {};
  const channel = isRecord(channels[channelId]) ? channels[channelId] : {};
  const accounts = channel.accounts;
  if (isRecord(accounts)) {
    const keys = Object.keys(accounts).filter((key) => key.trim().length > 0);
    if (keys.length > 0) {
      return keys;
    }
  }
  return [IMPLICIT_ACCOUNT_ID];
}

/** Agent ids available as routing targets. */
export function readAgentIds(configValue: Record<string, unknown> | null): string[] {
  const agents = isRecord(configValue?.agents) ? configValue.agents : {};
  const entries = isRecord(agents.entries) ? agents.entries : {};
  const ids = Object.keys(entries).filter((id) => id.trim().length > 0);
  return ids.length > 0 ? ids : ["main"];
}

/** Account-level route bindings for one channel (peer-scoped and acp bindings untouched). */
export function readChannelRouteBindings(
  configValue: Record<string, unknown> | null,
  channelId: string,
): RouteBinding[] {
  const bindings = Array.isArray(configValue?.bindings) ? (configValue.bindings as unknown[]) : [];
  return bindings.filter((binding): binding is RouteBinding => {
    if (!isRecord(binding) || !isRecord(binding.match)) {
      return false;
    }
    if (binding.match.channel !== channelId) {
      return false;
    }
    const type = binding.type;
    if (type !== undefined && type !== "route") {
      return false;
    }
    return (
      binding.match.peer === undefined &&
      binding.match.guildId === undefined &&
      binding.match.teamId === undefined &&
      binding.match.roles === undefined
    );
  });
}

type EffectiveAgent = { agentId: string | null; viaWildcard: boolean };

/** The agent an account resolves to: its own binding, else the channel wildcard. */
export function resolveAccountAgent(bindings: RouteBinding[], accountId: string): EffectiveAgent {
  const specific = bindings.find((binding) => (binding.match?.accountId ?? "") === accountId);
  if (specific && typeof specific.agentId === "string") {
    return { agentId: specific.agentId, viaWildcard: false };
  }
  const wildcard = bindings.find((binding) => binding.match?.accountId === WILDCARD_ACCOUNT);
  if (wildcard && typeof wildcard.agentId === "string") {
    return { agentId: wildcard.agentId, viaWildcard: true };
  }
  return { agentId: null, viaWildcard: false };
}

/** Writes account-level bindings, preserving every other binding as-is. */
export function writeAccountBindings(params: {
  configValue: Record<string, unknown> | null;
  channelId: string;
  /** agentId null removes the binding; WILDCARD_ACCOUNT addresses the catch-all. */
  assignments: Array<{ accountId: string; agentId: string | null }>;
}): Array<Record<string, unknown>> {
  const { configValue, channelId, assignments } = params;
  const bindings: unknown[] = Array.isArray(configValue?.bindings)
    ? (configValue.bindings as unknown[])
    : [];
  const channelAccountBindings = new Set<unknown>(readChannelRouteBindings(configValue, channelId));
  const preserved = bindings.filter((binding) => !channelAccountBindings.has(binding)) as Array<
    Record<string, unknown>
  >;
  const specific: RouteBinding[] = [];
  let wildcard: RouteBinding | null = null;
  for (const { accountId, agentId } of assignments) {
    if (!agentId) {
      continue;
    }
    const binding: RouteBinding = {
      agentId,
      match: { channel: channelId, accountId },
    };
    if (accountId === WILDCARD_ACCOUNT) {
      wildcard = binding;
    } else {
      specific.push(binding);
    }
  }
  // Specific bindings must come before the wildcard so the catch-all stays a
  // fallback rather than shadowing per-account routes.
  return [...preserved, ...specific, ...(wildcard ? [wildcard] : [])];
}

export function renderChannelAgentRoutingSection(params: {
  channelId: string;
  props: ChannelsProps;
}) {
  const { channelId, props } = params;
  const configValue = props.config.configForm;
  const accounts = readChannelAccounts(configValue, channelId);
  const agentIds = readAgentIds(configValue);
  const bindings = readChannelRouteBindings(configValue, channelId);
  const disabled = props.config.configSaving || props.config.configSchemaLoading;

  const rows = [
    ...accounts.map((accountId) => ({ accountId, catchAll: false })),
    { accountId: WILDCARD_ACCOUNT, catchAll: true },
  ];
  const update = (accountId: string, agentId: string) => {
    const assignments: Array<{ accountId: string; agentId: string | null }> = accounts.map(
      (account) => {
        if (account === accountId) {
          return { accountId: account, agentId: agentId || null };
        }
        const effective = resolveAccountAgent(bindings, account);
        // Accounts inheriting from the catch-all stay bindingless; the
        // wildcard row owns their effective agent.
        return {
          accountId: account,
          agentId: effective.viaWildcard ? null : effective.agentId,
        };
      },
    );
    assignments.push({
      accountId: WILDCARD_ACCOUNT,
      agentId:
        accountId === WILDCARD_ACCOUNT
          ? agentId || null
          : resolveAccountAgent(bindings, WILDCARD_ACCOUNT).agentId,
    });
    props.onConfigPatch(
      ["bindings"],
      writeAccountBindings({ configValue, channelId, assignments }),
    );
  };

  return html`
    <div class="settings-row settings-row--stacked">
      <div class="settings-row__text">
        <span class="settings-row__title">${t("channels.routing.title")}</span>
        <p class="settings-row__desc">${t("channels.routing.description")}</p>
      </div>
      <div class="settings-row__control">
        ${rows.map(({ accountId, catchAll }) => {
          const effective = resolveAccountAgent(bindings, accountId);
          const selected = effective.agentId ?? "";
          return html`
            <label class="field">
              <span>
                ${
                  catchAll
                    ? t("channels.routing.catchAll")
                    : accountId === IMPLICIT_ACCOUNT_ID
                      ? t("channels.routing.defaultAccount")
                      : accountId
                }
                ${
                  effective.viaWildcard
                    ? html`<span class="settings-row__desc">
                        (${t("channels.routing.viaCatchAll")})</span
                      >`
                    : nothing
                }
              </span>
              <select
                class="settings-input"
                ?disabled=${disabled}
                @change=${(event: Event) => {
                  update(accountId, (event.currentTarget as HTMLSelectElement).value);
                }}
              >
                <option value="" ?selected=${selected === ""}>
                  ${t("channels.routing.notSet")}
                </option>
                ${agentIds.map(
                  (agentId) => html`
                    <option value=${agentId} ?selected=${selected === agentId}>${agentId}</option>
                  `,
                )}
              </select>
            </label>
          `;
        })}
        <p class="settings-row__desc">${t("channels.routing.notSetHint")}</p>
      </div>
    </div>
  `;
}
