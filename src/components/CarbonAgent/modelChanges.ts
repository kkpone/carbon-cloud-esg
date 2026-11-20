import { parsedRecord, record, text } from './protocol';
import type { Data } from './protocol';

// Names mirror the product-model write operations registered by the gateway.
const writeTools = new Set([
  'modeling_execute',
  'modeling_execute_structured',
  'modeling_update',
  'modeling_account_update',
  'modeling_account_update_structured',
  'modeling_emission_update',
  'modeling_emission_update_structured',
  'modeling_emission_batch_update',
  'modeling_emission_batch_update_structured',
  'modeling_emission_add',
  'modeling_emission_add_structured',
  'modeling_emission_batch_add',
  'modeling_emission_batch_add_structured',
  'modeling_emission_delete',
  'modeling_emission_delete_structured',
  'modeling_re_modeling',
  'modeling_remodeling',
  'modeling/execute',
  'modeling/executestructured',
  'modeling/update',
  'modeling/account/updatestructured',
  'modeling/emission/updatestructured',
  'modeling/emission/batchupdatestructured',
  'modeling/emission/addstructured',
  'modeling/emission/batchaddstructured',
  'modeling/emission/deletestructured',
  'modeling/remodeling',
  'modeling/remodel',
]);

export function hasModelWrite(events: Data[], messageId?: string): boolean {
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
          result.type === 'model_write_rejected',
      )
    )
      return false;
    return writeTools.has(name || names.get(id) || '');
  });
}
