import { html } from "lit";
import type { ConfigUiHints } from "../../api/types.ts";
import {
  analyzeConfigSchema,
  renderConfigTierGroups,
  renderNode,
  schemaType,
  type JsonSchema,
} from "../../components/config-form.ts";
import { renderSettingsLoadingSkeleton } from "../../components/settings-ui.ts";
import { t } from "../../i18n/index.ts";
import { formatChannelExtraValue, resolveChannelConfigValue } from "../../lib/channels/index.ts";
import { CHANNEL_FIELD_META } from "./view.field-meta.ts";
import type { ChannelsProps } from "./view.types.ts";

function resolveSchemaNode(schema: JsonSchema | null, path: string[]): JsonSchema | null {
  let current = schema;
  for (const key of path) {
    if (!current || schemaType(current) !== "object") {
      return null;
    }
    const additional = current.additionalProperties;
    current =
      current.properties?.[key] ||
      (additional && typeof additional === "object" ? additional : null);
  }
  return current;
}

/**
 * Layers the curated channel field vocabulary over the gateway uiHints at
 * the concrete channel paths (direct hints win over wildcards, so
 * overriding here is the only way labels and ordering take effect). Only
 * presentation keys are touched; server-owned flags like `sensitive` pass
 * through untouched.
 */
export function withChannelFieldHints(hints: ConfigUiHints, channelId: string): ConfigUiHints {
  const merged: ConfigUiHints = { ...hints };
  const prefixes = [`channels.${channelId}`, `channels.${channelId}.accounts.*`];
  for (const [field, meta] of Object.entries(CHANNEL_FIELD_META)) {
    for (const prefix of prefixes) {
      const key = `${prefix}.${field}`;
      const existing = hints[key];
      merged[key] = {
        ...existing,
        // The dictionary fills presentation keys the gateway hints do not
        // set; explicitly provided hints (operator or plugin) keep winning.
        ...(existing?.label === undefined ? { label: t(meta.labelKey) } : {}),
        ...(existing?.help === undefined && meta.helpKey ? { help: t(meta.helpKey) } : {}),
        ...(existing?.order === undefined ? { order: meta.order } : {}),
        // Dictionary fields render in the common section unless explicitly
        // folded away (the bare-hint default is advanced).
        ...(existing?.advanced === undefined ? { advanced: meta.advanced ?? false } : {}),
      };
    }
  }
  return merged;
}

const EXTRA_CHANNEL_FIELDS = ["groupPolicy", "streamMode", "dmPolicy"] as const;

function renderExtraChannelFields(value: Record<string, unknown>) {
  const fields = EXTRA_CHANNEL_FIELDS.filter((field) => field in value);
  if (fields.length === 0) {
    return null;
  }
  return html`
    <div>
      ${fields.map(
        (field) => html`
          <div class="settings-row__desc">${field}: ${formatChannelExtraValue(value[field])}</div>
        `,
      )}
    </div>
  `;
}

function renderChannelConfigForm(channelId: string, props: ChannelsProps, disabled: boolean) {
  const config = props.config;
  const analysis = analyzeConfigSchema(config.configSchema);
  const normalized = analysis.schema;
  if (!normalized) {
    return html`<div class="settings-row__desc">${t("channels.config.schemaUnavailable")}</div>`;
  }
  const node = resolveSchemaNode(normalized, ["channels", channelId]);
  if (!node) {
    return html`
      <div class="settings-row__desc">${t("channels.config.channelSchemaUnavailable")}</div>
    `;
  }
  const value = resolveChannelConfigValue(config.configForm ?? {}, channelId) ?? {};
  const path = ["channels", channelId];
  const hints = withChannelFieldHints(config.configUiHints, channelId);
  const unsupported = new Set(analysis.unsupportedPaths);
  return html`
    <div class="config-form">
      ${renderConfigTierGroups({
        schema: node,
        path,
        hints,
        revealAdvanced: props.showAdvancedSettings,
        onShowAdvanced: () => props.onShowAdvancedSettings(true),
        onHideAdvanced: () => props.onShowAdvancedSettings(false),
        renderTier: (tier) =>
          renderNode({
            schema: tier,
            value,
            path,
            hints,
            unsupported,
            disabled,
            showLabel: false,
            onPatch: props.onConfigPatch,
          }),
      })}
    </div>
    ${renderExtraChannelFields(value)}
  `;
}

export function renderChannelConfigSection(params: { channelId: string; props: ChannelsProps }) {
  const { channelId, props } = params;
  const disabled = props.config.configSaving || props.config.configSchemaLoading;
  if (props.config.configSchemaLoading) {
    return renderSettingsLoadingSkeleton({ label: t("channels.config.loadingSchema"), rows: 2 });
  }
  return html`
    <div class="settings-row settings-row--stacked">
      ${renderChannelConfigForm(channelId, props, disabled)}
      ${
        props.config.lastError
          ? html`<div class="callout danger" role="alert">${props.config.lastError}</div>`
          : null
      }
      <div class="settings-row__control">
        <button
          class="btn primary"
          ?disabled=${disabled || !props.config.configFormDirty}
          @click=${() => props.onConfigSave()}
        >
          ${props.config.configSaving ? t("common.saving") : t("common.save")}
        </button>
        <button class="btn" ?disabled=${disabled} @click=${() => props.onConfigReload()}>
          ${t("common.reload")}
        </button>
      </div>
    </div>
  `;
}
