import shadow1 from '@/assets/images/carbonCompetition/rank-shadow-1.svg';
import shadow2 from '@/assets/images/carbonCompetition/rank-shadow-2.svg';
import shadow3 from '@/assets/images/carbonCompetition/rank-shadow-3.svg';
import surface1 from '@/assets/images/carbonCompetition/rank-surface-1.svg';
import surface2 from '@/assets/images/carbonCompetition/rank-surface-2.svg';
import surface3 from '@/assets/images/carbonCompetition/rank-surface-3.svg';
import letter1 from '@/assets/images/carbonCompetition/rank-letter-1.svg';
import letter2 from '@/assets/images/carbonCompetition/rank-letter-2.svg';
import letter3 from '@/assets/images/carbonCompetition/rank-letter-3.svg';
import border from '@/assets/images/carbonCompetition/rank-border.svg';
import mask from '@/assets/images/carbonCompetition/rank-mask.svg';
import maskTwo from '@/assets/images/carbonCompetition/rank-mask-2.svg';
import glow from '@/assets/images/carbonCompetition/rank-glow-1.svg';
import glowTwo from '@/assets/images/carbonCompetition/rank-glow-2.svg';
import styles from './index.module.less';

const badges = [
  [shadow1, surface1, letter1, mask, glow],
  [shadow2, surface2, letter2, maskTwo, glowTwo],
  [shadow3, surface3, letter3, mask, glow],
];

export default function CompetitionRankBadge({ rank }: { rank: number }) {
  const assets = badges[rank - 1];
  if (!assets) return <span>{rank}</span>;
  const [shadow, surface, lettering, clip, reflection] = assets;
  return (
    <span
      className={`${styles.badge} ${styles[`rank${rank}`]}`}
      role='img'
      aria-label={String(rank)}
    >
      <img className={styles.shadow} src={shadow} alt='' />
      <img className={styles.surface} src={surface} alt='' />
      <span className={styles.reflection} style={{ maskImage: `url(${clip})` }}>
        <img src={reflection} alt='' />
      </span>
      <img className={styles.border} src={border} alt='' />
      <img className={styles.lettering} src={lettering} alt='' />
      <span className={styles.number}>{rank}</span>
    </span>
  );
}
