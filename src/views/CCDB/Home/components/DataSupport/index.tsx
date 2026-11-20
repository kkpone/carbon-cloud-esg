import qrCodeImg from '@assets/svg/service_qr_code.png';
import I18N from '@src/lang/I18N';
import { Button, Popover } from 'antd';

import styles from './index.module.less';

export default function DataSupport() {
  return (
    <div className={styles.support}>
      <span>{I18N.ccdb.factorSupportPrompt}</span>
      <Popover
        placement='bottom'
        trigger={['hover', 'click']}
        content={
          <div className={styles.card}>
            <div className={styles.title}>{I18N.ccdb.factorSupportTitle}</div>
            <div>{I18N.ccdb.factorSupportScan}</div>
            <img src={qrCodeImg} alt={I18N.ccdb.factorSupportQrAlt} />
            <div className={styles.footer}>{I18N.ccdb.factorSupportHelp}</div>
          </div>
        }
      >
        <Button type='link' className={styles.contact}>
          {I18N.ccdb.factorSupportContact}
        </Button>
      </Popover>
    </div>
  );
}
