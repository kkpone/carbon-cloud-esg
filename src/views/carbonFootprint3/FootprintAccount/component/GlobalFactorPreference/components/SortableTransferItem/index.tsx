import { HolderOutlined } from '@ant-design/icons';
import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
import { useSortable } from '@dnd-kit/react/sortable';

import { FactorSourceId } from '../../type';

import styles from './index.module.less';

type SortableTransferItemProps = {
  id: FactorSourceId;
  index: number;
  title: string;
  sortLabel: string;
  sortable: boolean;
  disabled: boolean;
};

const sortableType = 'factor-preference-source';
const sortableGroup = 'selected-factor-preference-sources';

export const SortableTransferItem = ({
  id,
  index,
  title,
  sortLabel,
  sortable,
  disabled,
}: SortableTransferItemProps) => {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({
    id,
    index,
    type: sortableType,
    accept: sortableType,
    group: sortableGroup,
    disabled: !sortable || disabled,
    modifiers: [RestrictToVerticalAxis],
  });

  return (
    <span
      ref={ref}
      className={styles.item}
      title={title}
      data-sortable={sortable}
      data-dragging={isDragging}
      data-drop-target={isDropTarget && !isDragging}
    >
      {sortable ? (
        <span
          ref={handleRef}
          className={styles.dragHandle}
          aria-label={`${title}, ${sortLabel}`}
        >
          <HolderOutlined aria-hidden='true' />
        </span>
      ) : null}
      {sortable ? <span className={styles.priority}>P{index + 1}</span> : null}
      <span className={styles.text}>{title}</span>
    </span>
  );
};
