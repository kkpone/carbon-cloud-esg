import { Modal } from 'antd';
import classNames from 'classnames';

import { IconAlibaba } from '@/components/iconfont';
import I18N from '@/lang/I18N';
import type { EnterpriseSubjectGroup } from '@/components/CarbonAgent/useEnterpriseNavigation';
import type { OrgAccount } from '@/views/enterpriseCarbonAccount2/AccountingList/type';
import {
  COMPUTATION_STATUS,
  COMPUTATION_STATUS_LABEL,
} from '@/views/enterpriseCarbonAccount2/constant';

import styles from './index.module.less';

export default function EnterpriseSubjectModal({
  open,
  groups,
  onSelect,
  onCancel,
}: {
  open: boolean;
  groups: EnterpriseSubjectGroup[];
  onSelect: (org: OrgAccount, periodName: string) => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      className={styles.modal}
      open={open}
      width={512}
      zIndex={2300}
      title={I18N.enterpriseCarbonAccount2.pleaseSelectTheSubject}
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        {groups.map(group => (
          <div className={styles.group} key={group.title}>
            <div className={styles.groupTitle}>{group.title}</div>
            {group.orgList.map(org => {
              const disabled =
                org.status === COMPUTATION_STATUS.NOT_START ||
                !org.computationId;

              return (
                <button
                  type='button'
                  key={org.id}
                  disabled={disabled}
                  className={classNames(styles.orgItem, {
                    [styles.notStartOrgItem]: disabled,
                  })}
                  onClick={() => {
                    if (!disabled) {
                      onSelect(org, group.title);
                    }
                  }}
                >
                  <div className={styles.orgInfo}>
                    <div className={styles.orgIconContent}>
                      <IconAlibaba
                        className={styles.orgIcon}
                        type='icon-icon_hesuanzhuti'
                      />
                    </div>
                    <div className={styles.orgName} title={org.orgName || org.name}>
                      {org.orgName || org.name}
                    </div>
                    <span
                      className={classNames(styles.statusTag, {
                        [styles.fillingStatusTag]:
                          org.status === COMPUTATION_STATUS.FILLING,
                        [styles.completedStatusTag]:
                          org.status === COMPUTATION_STATUS.COMPLETE,
                      })}
                    >
                      {COMPUTATION_STATUS_LABEL[org.status]}
                    </span>
                  </div>
                  {!disabled && (
                    <span className={styles.detailsBtn}>
                      <span>{I18N.carbonFootprint3.details}</span>
                      <IconAlibaba
                        className={styles.detailsBtnIcon}
                        type='icon-icon_arrow_rioght'
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}
