// Opt-in formatting for the public BrioBots demo only.
const DEMO_GUILD = '1550119459891576852';
const DEMO_SOURCE = '1557542302027874304';
const DEMO_AUDIT = '1557542556714139699';

export function buildPublicDemoAudit({ enabled, guildId, sourceChannelId, auditChannelId, eventType, filterResult }) {
  if (enabled !== true || guildId !== DEMO_GUILD || sourceChannelId !== DEMO_SOURCE || auditChannelId !== DEMO_AUDIT) return null;
  let content;
  if (eventType === 'published') {
    content = 'Published: the required phrase was found';
  } else if (eventType === 'skipped') {
    switch (filterResult?.reason) {
      case 'blocked_keyword': content = 'Skipped: a blocked phrase was found'; break;
      case 'missing_allowed_keyword': content = 'Skipped: the required phrase was missing'; break;
      case 'mode_mismatch': content = 'Skipped: this sender did not match the publishing rules'; break;
      default: content = filterResult ? 'Skipped: this post did not match the publishing rules' : 'Skipped: this post was already published';
    }
  } else if (eventType === 'failed') {
    content = 'Failed: the post could not be published';
  } else {
    content = 'Result: this demo decision could not be displayed';
  }
  // Never render raw content, IDs, configured values, or exception details.
  return { content, allowedMentions: { parse: [] } };
}
