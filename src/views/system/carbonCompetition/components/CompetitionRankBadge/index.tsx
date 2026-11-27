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

export type RankBadgeTier = 1 | 2 | 3;

export default function CompetitionRankBadge({
  rank,
  tier,
  hideNumber = false,
  ariaLabel,
}: {
  rank: number;
  tier?: RankBadgeTier;
  hideNumber?: boolean;
  ariaLabel?: string;
}) {
  const badgeIndex = (tier ?? rank) - 1;
  const assets = badges[badgeIndex];
  if (!assets) return <span>{rank}</span>;
  const [shadow, surface, lettering, clip, reflection] = assets;
  const tierClass = styles[`rank${tier ?? rank}`];
  return (
    <span
      className={`${styles.badge} ${tierClass} ${
        hideNumber ? styles.noNumber : ''
      }`}
      role='img'
      aria-label={ariaLabel || String(rank)}
    >
      <img className={styles.shadow} src={shadow} alt='' />
      <img className={styles.surface} src={surface} alt='' />
      <span className={styles.reflection} style={{ maskImage: `url(${clip})` }}>
        <img src={reflection} alt='' />
      </span>
      <img className={styles.border} src={border} alt='' />
      {hideNumber ? (
        <svg
          className={styles.medalStar}
          viewBox='0 0 16 16'
          fill='none'
          aria-hidden='true'
        >
          <path
            d='M8 2.1L9.62 5.38L13.24 5.9L10.62 8.45L11.24 12.06L8 10.36L4.76 12.06L5.38 8.45L2.76 5.9L6.38 5.38L8 2.1Z'
            fill='currentColor'
          />
        </svg>
      ) : (
        <>
          <img className={styles.lettering} src={lettering} alt='' />
          <span className={styles.number}>{rank}</span>
        </>
      )}
    </span>
  );
}
