import { useDndMonitor, useDraggable } from '@dnd-kit/core';
import type { Modifier } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip } from 'antd';
import { useState } from 'react';
import agentIcon from '@/assets/images/carbonAgent/icons/agent-logo.svg';
import I18N from '@/lang/I18N';
import styles from './index.module.less';

export const launcherModifiers: Modifier[] = [
  ({ transform, draggingNodeRect, windowRect }) => {
    if (!draggingNodeRect || !windowRect) return transform;
    return {
      ...transform,
      x: Math.max(
        -draggingNodeRect.left,
        Math.min(transform.x, windowRect.width - draggingNodeRect.right),
      ),
      y: Math.max(
        -draggingNodeRect.top,
        Math.min(transform.y, windowRect.height - draggingNodeRect.bottom),
      ),
    };
  },
];

export default function FloatingLauncher({
  hidden,
  onOpen,
}: {
  hidden: boolean;
  onOpen: () => void;
}) {
  const [top, setTop] = useState<number>();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: 'carbon-agent-launcher',
      disabled: hidden,
      attributes: { roleDescription: I18N.carbonAgent.openAssistant },
    });

  useDndMonitor({
    onDragEnd: ({ active, delta }) => {
      const { initial } = active.rect.current;
      if (active.id === 'carbon-agent-launcher' && initial) {
        setTop(initial.top + delta.y);
      }
    },
  });

  return (
    <Tooltip
      title={hidden || isDragging ? '' : I18N.carbonAgent.pageTitle}
      placement='left'
    >
      <button
        {...attributes}
        {...listeners}
        ref={setNodeRef}
        type='button'
        hidden={hidden}
        className={`${styles.launcher} ${isDragging ? styles.dragging : ''}`}
        style={{
          top:
            top === undefined
              ? undefined
              : `clamp(max(16px, env(safe-area-inset-top)), ${top}px, calc(100dvh - 48px - max(16px, env(safe-area-inset-bottom))))`,
          bottom: top === undefined ? undefined : 'auto',
          transform: CSS.Translate.toString(transform),
        }}
        aria-label={I18N.carbonAgent.openAssistant}
        onClick={onOpen}
      >
        <img src={agentIcon} alt='' draggable={false} />
      </button>
    </Tooltip>
  );
}
