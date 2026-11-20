import { useDraggable } from '@dnd-kit/core';
import I18N from '@/lang/I18N';
import styles from './index.module.less';

export default function ResizeHandle({
  onAdjust,
}: {
  onAdjust: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'carbon-agent-resize',
    attributes: { roleDescription: I18N.carbonAgent.resizeAssistant },
  });

  return (
    <button
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      type='button'
      className={`${styles.handle} ${isDragging ? styles.dragging : ''}`}
      aria-label={I18N.carbonAgent.resizeAssistant}
      title={I18N.carbonAgent.resizeInstructions}
      onKeyDown={event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        onAdjust(event.key === 'ArrowLeft' ? 25 : -25);
      }}
    />
  );
}
