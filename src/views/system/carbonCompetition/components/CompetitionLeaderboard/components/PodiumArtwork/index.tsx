import baseOne from '@/assets/images/carbonCompetition/leader-base-1.svg';
import baseTwo from '@/assets/images/carbonCompetition/leader-base-2.svg';
import baseThree from '@/assets/images/carbonCompetition/leader-base-3.svg';
import cardOne from '@/assets/images/carbonCompetition/leader-card-1.svg';
import cardTwo from '@/assets/images/carbonCompetition/leader-card-2.svg';
import cardThree from '@/assets/images/carbonCompetition/leader-card-3.svg';
import tabOne from '@/assets/images/carbonCompetition/leader-tab-1.svg';
import tabTwo from '@/assets/images/carbonCompetition/leader-tab-2.svg';
import tabThree from '@/assets/images/carbonCompetition/leader-tab-3.svg';
import borderOne from '@/assets/images/carbonCompetition/leader-border-1.svg';
import borderTwo from '@/assets/images/carbonCompetition/leader-border-2.svg';
import borderThree from '@/assets/images/carbonCompetition/leader-border-3.svg';
import cornerOne from '@/assets/images/carbonCompetition/leader-corner-1.svg';
import cornerTwo from '@/assets/images/carbonCompetition/leader-corner-2.svg';
import cornerThree from '@/assets/images/carbonCompetition/leader-corner-3.svg';
import shine from '@/assets/images/carbonCompetition/leader-shine.svg';
import styles from './index.module.less';

const artwork = [
  [baseOne, cardOne, tabOne, borderOne, cornerOne],
  [baseTwo, cardTwo, tabTwo, borderTwo, cornerTwo],
  [baseThree, cardThree, tabThree, borderThree, cornerThree],
];

export default function PodiumArtwork({ rank }: { rank: number }) {
  const [base, card, tab, border, corner] = artwork[rank - 1];
  return (
    <div className={styles.artwork} aria-hidden>
      <img className={styles.base} src={base} alt='' />
      <div className={styles.card}>
        <img className={styles.surface} src={card} alt='' />
        <img className={styles.tab} src={tab} alt='' />
        <img className={styles.border} src={border} alt='' />
        <img className={styles.shine} src={shine} alt='' />
        <img className={styles.corner} src={corner} alt='' />
        <span className={styles.rank}>TOP {rank}</span>
      </div>
    </div>
  );
}
