// Control UI view: curated presentation metadata for the shared channel
// config vocabulary. Channel plugins declare their own schemas, but a stable
// set of field names (credentials, admission, sessions, transport knobs)
// recurs across channels; this dictionary gives them operator-facing labels,
// help text, ordering, and low-frequency folding through ordinary uiHints, so
// every channel detail page reads the same way without forking renderers.
export type ChannelFieldMeta = {
  /** Sort weight inside the channel/account form; lower renders first. */
  order: number;
  /** Folds into the advanced disclosure at the channel level. */
  advanced?: boolean;
  labelKey: string;
  helpKey?: string;
};

export const CHANNEL_FIELD_META: Record<string, ChannelFieldMeta> = {
  enabled: {
    order: 5,
    labelKey: "configForm.fields.enabled.label",
    helpKey: "configForm.fields.enabled.help",
  },
  name: {
    order: 6,
    labelKey: "configForm.fields.name.label",
    helpKey: "configForm.fields.name.help",
  },
  clientId: {
    order: 10,
    labelKey: "configForm.fields.clientId.label",
    helpKey: "configForm.fields.clientId.help",
  },
  clientSecret: {
    order: 11,
    labelKey: "configForm.fields.clientSecret.label",
    helpKey: "configForm.fields.clientSecret.help",
  },
  chatbotUserId: {
    order: 12,
    advanced: true,
    labelKey: "configForm.fields.chatbotUserId.label",
    helpKey: "configForm.fields.chatbotUserId.help",
  },
  chatbotCorpId: {
    order: 13,
    advanced: true,
    labelKey: "configForm.fields.chatbotCorpId.label",
  },
  defaultAccount: {
    order: 15,
    labelKey: "configForm.fields.defaultAccount.label",
    helpKey: "configForm.fields.defaultAccount.help",
  },
  dmPolicy: {
    order: 20,
    labelKey: "configForm.fields.dmPolicy.label",
    helpKey: "configForm.fields.dmPolicy.help",
  },
  allowFrom: {
    order: 21,
    labelKey: "configForm.fields.allowFrom.label",
    helpKey: "configForm.fields.allowFrom.help",
  },
  groupPolicy: {
    order: 22,
    labelKey: "configForm.fields.groupPolicy.label",
    helpKey: "configForm.fields.groupPolicy.help",
  },
  groupAllowFrom: {
    order: 23,
    labelKey: "configForm.fields.groupAllowFrom.label",
    helpKey: "configForm.fields.groupAllowFrom.help",
  },
  requireMention: {
    order: 24,
    labelKey: "configForm.fields.requireMention.label",
    helpKey: "configForm.fields.requireMention.help",
  },
  groups: {
    order: 25,
    labelKey: "configForm.fields.groups.label",
    helpKey: "configForm.fields.groups.help",
  },
  separateSessionByConversation: {
    order: 30,
    labelKey: "configForm.fields.separateSessionByConversation.label",
    helpKey: "configForm.fields.separateSessionByConversation.help",
  },
  sharedMemoryAcrossConversations: {
    order: 31,
    labelKey: "configForm.fields.sharedMemoryAcrossConversations.label",
    helpKey: "configForm.fields.sharedMemoryAcrossConversations.help",
  },
  typingIndicator: {
    order: 32,
    labelKey: "configForm.fields.typingIndicator.label",
  },
  systemPrompt: {
    order: 33,
    labelKey: "configForm.fields.systemPrompt.label",
  },
  tools: {
    order: 35,
    labelKey: "configForm.fields.tools.label",
    helpKey: "configForm.fields.tools.help",
  },
  ackText: {
    order: 40,
    advanced: true,
    labelKey: "configForm.fields.ackText.label",
    helpKey: "configForm.fields.ackText.help",
  },
  asyncMode: {
    order: 41,
    advanced: true,
    labelKey: "configForm.fields.asyncMode.label",
    helpKey: "configForm.fields.asyncMode.help",
  },
  historyLimit: {
    order: 42,
    advanced: true,
    labelKey: "configForm.fields.historyLimit.label",
  },
  textChunkLimit: {
    order: 43,
    advanced: true,
    labelKey: "configForm.fields.textChunkLimit.label",
  },
  mediaMaxMb: {
    order: 44,
    advanced: true,
    labelKey: "configForm.fields.mediaMaxMb.label",
  },
  resolveSenderNames: {
    order: 45,
    advanced: true,
    labelKey: "configForm.fields.resolveSenderNames.label",
  },
  groupSessionScope: {
    order: 46,
    advanced: true,
    labelKey: "configForm.fields.groupSessionScope.label",
  },
  groupReplyMode: {
    order: 47,
    advanced: true,
    labelKey: "configForm.fields.groupReplyMode.label",
  },
  endpoint: {
    order: 48,
    advanced: true,
    labelKey: "configForm.fields.endpoint.label",
  },
  debug: {
    order: 49,
    advanced: true,
    labelKey: "configForm.fields.debug.label",
  },
  heartbeatVisibility: {
    order: 50,
    advanced: true,
    labelKey: "configForm.fields.heartbeatVisibility.label",
  },
};
