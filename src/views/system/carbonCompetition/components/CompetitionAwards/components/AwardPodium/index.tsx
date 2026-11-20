import { useRef } from 'react';
import { useSize } from 'ahooks';
import I18N from '@/lang/I18N';
import { designAssets } from '../../designAssets';
import styles from './index.module.less';

export type AwardRank = 'silver' | 'gold' | 'bronze';

export default function AwardPodium({ rank }: { rank: AwardRank }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const gold = rank === 'gold';
  const width = gold ? 420 : 352;
  const d = I18N.carbonCompetition.design.awardDetails;
  return (
    <div
      ref={ref}
      className={styles.podium}
      style={{ aspectRatio: `${width} / 178` }}
    >
      <div
        className={`${styles.artwork} ${styles[rank]}`}
        style={{ transform: `scale(${(size?.width ?? width) / width})` }}
      >
        <img
          className={styles.base}
          src={designAssets[`${rank}-podium`]}
          alt=''
        />
        <div className={styles.card}>
          {(['shadow', 'ribbon', 'border', 'card', 'shine'] as const).map(
            layer => (
              <img
                key={layer}
                className={styles[layer]}
                src={designAssets[`${rank}-${layer}`]}
                alt=''
              />
            ),
          )}
          <span className={styles.places}>
            {I18N.template(d.places, {
              count: gold ? 1 : rank === 'silver' ? 2 : 3,
            })}
          </span>
        </div>
        <h4 className={styles.title}>{d[rank]}</h4>
        <div className={styles.trophy}>
          <img src={designAssets[`${rank}-trophy`]} alt='' />
        </div>
      </div>
    </div>
  );
}
