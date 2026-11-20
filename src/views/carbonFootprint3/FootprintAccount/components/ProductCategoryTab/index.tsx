import { Dropdown } from 'antd';
import classNames from 'classnames';
import { useEffect, useState } from 'react';

import { IconAlibaba } from '@/components/iconfont';
import I18N from '@/lang/I18N';

import styles from './index.module.less';

interface ProductCategoryTabProps {
  name: string;
  active: boolean;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProductCategoryTab({
  name,
  active,
  isDefault,
  onEdit,
  onDelete,
}: ProductCategoryTabProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [active]);

  return (
    <Dropdown
      open={open}
      trigger={['click']}
      placement='bottomLeft'
      align={{ offset: [-4, 12] }}
      overlayClassName={styles.menu}
      getPopupContainer={trigger =>
        trigger.closest<HTMLElement>('.ant-tabs-dropdown') || document.body
      }
      onOpenChange={nextOpen => {
        // 整个标签用于菜单定位，只有更多按钮负责展开；名称仍用于切换分类。
        if (!nextOpen) setOpen(false);
      }}
      menu={{
        items: [
          {
            key: 'edit',
            label: I18N.carbonFootprint.edit,
            icon: <IconAlibaba type='icon-a-icon_edit' />,
            onClick: onEdit,
          },
          isDefault
            ? null
            : {
                key: 'delete',
                label: I18N.carbonFootprint.delete,
                icon: <IconAlibaba type='icon-icon_delete' />,
                danger: true,
                onClick: onDelete,
              },
        ],
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          setOpen(false);
        },
      }}
    >
      <div
        className={classNames(styles.category, {
          [styles.active]: active,
          [styles.menuOpen]: open,
        })}
      >
        <span className={styles.name}>{name}</span>
        <button
          type='button'
          className={styles.trigger}
          aria-label={`${name} ${I18N.carbonFootprint.operation}`}
          aria-haspopup='menu'
          aria-expanded={open}
          onClick={event => {
            event.stopPropagation();
            setOpen(value => !value);
          }}
          onKeyDown={event => event.stopPropagation()}
        >
          <span className={styles.dots} aria-hidden />
        </button>
      </div>
    </Dropdown>
  );
}
