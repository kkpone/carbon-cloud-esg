import { parsedRecord, record, text } from './protocol';
import type { Data } from './protocol';

const enterpriseWriteToolNames = new Set([
  'enterprise_accounting_create',
  'enterprise_computation_create',
  'enterprise_computation_submit',
  'enterprise_computation_revoke',
  'enterprise_source_add',
  'enterprise_source_batch_add',
  'enterprise_source_update',
  'enterprise_source_batch_update',
  'enterprise_source_delete',
  'enterprise_activity_data_update',
  'enterprise_factor_match',
  'enterprise_report_generate',
  'enterprise/accounting/create',
  'enterprise/computation/create',
  'enterprise/computation/submit',
  'enterprise/computation/revoke',
  'enterprise/source/add',
  'enterprise/source/batchadd',
  'enterprise/source/update',
  'enterprise/source/batchupdate',
  'enterprise/source/delete',
  'enterprise/activitydata/update',
  'enterprise/factor/match',
  'enterprise/report/generate',
]);

const enterpriseWritePattern =
  /^(enterprise[_/](?:source|computation|accounting|activity[_-]?data|factor|emission|report)[_/].*(?:add|create|update|edit|save|delete|remove|submit|revoke|match|import|generate)|(?:add|create|update|edit|save|delete|remove)[_-]?enterprise[_-]?(?:source|emission|activity[_-]?data|computation))/i;

const isEnterpriseWriteTool = (name: string) => {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/^agent_/, '');
  return (
    enterpriseWriteToolNames.has(normalized) ||
    enterpriseWritePattern.test(normalized)
  );
};

export function hasEnterpriseWrite(events: Data[], messageId?: string): boolean {
  const names = new Map<string, string>();
  return events.some(event => {
    const envelope = parsedRecord(event.safePayloadJson || event.safePayload);
    const safe = {
      ...record(event.payload),
      ...envelope,
      ...record(envelope.safePayload),
    };
    const eventMessageId = text(event.messageId || safe.messageId);
    if (messageId && eventMessageId && eventMessageId !== messageId)
      return false;
    const id = text(
      event.toolCallId ||
        safe.toolCallId ||
        event.parentEventId ||
        event.eventId,
    );
    const name = text(event.toolName || safe.toolName)
      .toLowerCase()
      .replace(/^agent_/, '');
    if (id && name) names.set(id, name);
    if (event.eventType !== 'tool_call_success' || safe.autoClosed === true)
      return false;
    const output = record(safe.contentJson);
    if (
      [safe, output].some(
        result =>
          result.success === false ||
          result.isError === true ||
          result.type === 'mcp_tool_error' ||
          result.type === 'enterprise_write_rejected' ||
          result.type === 'model_write_rejected',
      )
    )
      return false;
    return isEnterpriseWriteTool(name || names.get(id) || '');
  });
}

export function hasEnterpriseWriteCard(cards: Data[]): boolean {
  return cards.some(card => {
    const cardType = text(card.cardType).toLowerCase();
    const moduleName = text(card.module || card.moduleName).toLowerCase();
    const bizType = text(record(card.bizRef).bizType || card.bizType).toLowerCase();
    return (
      cardType === 'enterprise_carbon_computation' ||
      cardType === 'enterprise_carbon_report' ||
      (moduleName === 'enterprise' &&
        (bizType === 'account' || bizType === 'report'))
    );
  });
}
