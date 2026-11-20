import I18N from '@/lang/I18N';
import { useState } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Tool } from '../../../../protocol';
import styles from './index.module.less';

export function groupTools(tools: Tool[]): Tool[][] {
  const groups = new Map<string, Tool[]>();
  tools.forEach(tool => {
    const key = tool.toolName?.trim().toLowerCase() || tool.title || tool.id;
    const group = groups.get(key);
    if (group) group.push(tool);
    else groups.set(key, [tool]);
  });
  return Array.from(groups.values());
}

function ToolLine({ tool, count }: { tool: Tool; count?: number }) {
  const labels: Record<string, string> = {
    SUCCESS: I18N.carbonAgent.success,
    FAILED: I18N.carbonAgent.failed,
    RUNNING: I18N.carbonAgent.running,
    ENDED: I18N.carbonAgent.ended,
  };
  return (
    <span className={styles.toolLine}>
      {tool.status === 'RUNNING' ? (
        <LoadingOutlined spin />
      ) : tool.status === 'FAILED' ? (
        <CloseCircleOutlined />
      ) : tool.status === 'SUCCESS' ? (
        <CheckCircleOutlined />
      ) : (
        <MinusCircleOutlined />
      )}
      <span className={styles.toolTitle}>
        {tool.title}
        {count && count > 1 ? (
          <span className={styles.count}>
            {' · '}
            {I18N.template(I18N.carbonAgent.toolCallCount, { count })}
          </span>
        ) : null}
      </span>
      <span className={styles.toolStatus}>
        {labels[tool.status] || tool.status}
      </span>
      {count && count > 1 ? (
        <RightOutlined className={styles.chevron} aria-hidden />
      ) : null}
    </span>
  );
}

function ToolGroup({ tools }: { tools: Tool[] }) {
  const [expanded, setExpanded] = useState(false);
  const first = tools[0];
  if (tools.length === 1) {
    return (
      <div className={styles.tool} data-status={first.status}>
        <ToolLine tool={first} />
        {first.error && <p>{first.error}</p>}
      </div>
    );
  }
  // Keep active work and failures visible even when later calls succeed.
  const summary =
    tools.find(tool => tool.status === 'RUNNING') ||
    tools.find(tool => tool.status === 'FAILED') ||
    tools[tools.length - 1];
  return (
    <details
      className={styles.tool}
      data-status={summary.status}
      open={expanded}
      onToggle={event => setExpanded(event.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <ToolLine
          tool={{ ...summary, title: first.title }}
          count={tools.length}
        />
      </summary>
      {expanded && (
        <div className={styles.calls}>
          {tools.map(tool => (
            <div
              key={tool.id}
              className={styles.tool}
              data-status={tool.status}
            >
              <ToolLine tool={tool} />
              {tool.error && <p>{tool.error}</p>}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

export default function ToolCalls({ tools }: { tools: Tool[] }) {
  return (
    <>
      {groupTools(tools).map(group => (
        <ToolGroup key={group[0].id} tools={group} />
      ))}
    </>
  );
}
