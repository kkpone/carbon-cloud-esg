import I18N from '@/lang/I18N';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert } from 'antd';
import { LoadingOutlined, FileTextOutlined } from '@ant-design/icons';
import { useCarbonAgent } from '../../context';
import { approvalText } from '../../protocol';
import MessageCard from './components/MessageCard';
import ToolCalls from './components/ToolCalls';
import styles from './index.module.less';

export default function Messages() {
  const agent = useCarbonAgent();
  const container = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    if (pinned.current && container.current)
      container.current.scrollTop = container.current.scrollHeight;
  }, [agent.chat?.turns]);
  useEffect(() => {
    const { chat } = agent;
    const element = container.current;
    if (!element || !chat) return;
    element.scrollTop = chat.scrollTop ?? element.scrollHeight;
    pinned.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }, [agent.chat?.session.sessionId]);
  const disabled =
    agent.loading ||
    agent.chat?.busy ||
    agent.chat?.uncertain ||
    !agent.access?.canUseAi;
  const activeTool = agent.chat?.turns
    .at(-1)
    ?.tools.some(tool => tool.status === 'RUNNING');
  return (
    <div
      className={styles.messages}
      ref={container}
      onScroll={event => {
        const element = event.currentTarget;
        if (agent.chat) agent.chat.scrollTop = element.scrollTop;
        pinned.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 120;
      }}
      aria-live='polite'
    >
      {!agent.chat?.turns.length && (
        <div className={styles.empty}>
          <strong>Carbon Agent</strong>
          <p>{I18N.carbonAgent.welcome}</p>
        </div>
      )}
      {agent.chat?.turns.map(turn => (
        <article
          key={turn.id}
          className={turn.role === 'user' ? styles.user : styles.answer}
        >
          {!!turn.attachments?.length && (
            <div className={styles.attachments}>
              {turn.attachments.map(file => (
                <span className={styles.attachment} key={file.fileId}>
                  <FileTextOutlined aria-hidden />
                  <span>{file.name}</span>
                </span>
              ))}
            </div>
          )}
          {turn.tools.length > 0 && (
            <div className={styles.tools}>
              <ToolCalls tools={turn.tools} />
              {agent.chat?.busy &&
                turn === agent.chat.turns.at(-1) &&
                activeTool && (
                  <p className={styles.taskHint}>
                    {I18N.carbonAgent.backgroundTaskHint}
                  </p>
                )}
            </div>
          )}
          {!!turn.content &&
            (turn.role === 'user' ||
              !!approvalText(turn.content, turn.blocks)) &&
            (!turn.blocks.some(block => block.blockType === 'markdown') ||
              turn.role === 'user') && (
              <div className={styles.markdown}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {turn.role === 'user'
                    ? turn.content
                    : approvalText(turn.content, turn.blocks)}
                </ReactMarkdown>
              </div>
            )}
          {turn.blocks.map(block =>
            block.blockType === 'markdown' ? (
              approvalText(block.content || '', turn.blocks) ? (
                <div key={block.blockId} className={styles.markdown}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {approvalText(block.content || '', turn.blocks)}
                  </ReactMarkdown>
                </div>
              ) : null
            ) : block.blockType === 'error' ? (
              <Alert
                showIcon
                key={block.blockId}
                type='error'
                message={block.content}
              />
            ) : (
              <MessageCard
                key={block.blockId}
                block={block}
                draftId={`${turn.messageId}:${block.blockId}`}
                failed={/FAILED|ERROR|CANCELLED/i.test(turn.status || '')}
                disabled={Boolean(disabled || turn.locked)}
              />
            ),
          )}
        </article>
      ))}
      {agent.chat?.busy && !activeTool && (
        <div className={styles.pending} role='status'>
          <LoadingOutlined spin />
          <div>
            <span>{I18N.carbonAgent.processing}</span>
            <p>{I18N.carbonAgent.backgroundTaskHint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
