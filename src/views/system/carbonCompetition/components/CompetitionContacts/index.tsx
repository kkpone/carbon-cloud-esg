import I18N from '@/lang/I18N';
import { Image } from 'antd';
import type { Overview } from '../../types';
import styles from './index.module.less';

export default function CompetitionContacts({
  event,
  dark = false,
}: {
  event: Overview;
  dark?: boolean;
}) {
  const t = I18N.carbonCompetition;
  const d = t.design;
  return (
    <footer className={`${styles.footer} ${dark ? styles.dark : ''}`}>
      {dark && <h2>{d.contact}</h2>}
      <div className={styles.contacts}>
        {(['groupQrFileKey', 'assistantQrFileKey'] as const).map(key => {
          const asset = event.publicAssets?.find(
            file => file.fileKey === event.publicContent[key],
          );
          const group = key === 'groupQrFileKey';
          const label = group ? t.groupQr : t.assistantQr;
          return (
            <section key={key} className={styles.contact}>
              <div className={styles.qr}>
                <div className={styles.qrInner}>
                  {asset ? (
                    <Image src={asset.url} alt={label} />
                  ) : (
                    <span>{d.qrPending}</span>
                  )}
                </div>
              </div>
              <div>
                <h3>{label}</h3>
                <p>{group ? d.groupHint : d.assistantHint}</p>
              </div>
            </section>
          );
        })}
      </div>
    </footer>
  );
}
