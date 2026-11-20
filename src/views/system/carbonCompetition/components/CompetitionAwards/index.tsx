import I18N from '@/lang/I18N';
import { competitionAssets as assets } from '../../assets';
import styles from './index.module.less';
import AwardPodium, { type AwardRank } from './components/AwardPodium';
import { designAssets } from './designAssets';

const ranks: AwardRank[] = ['silver', 'gold', 'bronze'];

export default function CompetitionAwards({
  description,
}: {
  description?: string;
}) {
  const d = I18N.carbonCompetition.design;
  return (
    <div className={styles.awards}>
      {(['enterprise', 'individual'] as const).map(group => (
        <section
          key={group}
          className={`${styles.group} ${
            group === 'individual' ? styles.individual : ''
          }`}
        >
          <h3>{d[group]}</h3>
          <div className={styles.rankings}>
            {ranks.map(rank => (
              <article key={rank} className={`${styles.rank} ${styles[rank]}`}>
                <AwardPodium rank={rank} />
                {rank !== 'silver' && (
                  <img
                    className={styles.rankDivider}
                    src={designAssets[`${group}-divider`]}
                    alt=''
                  />
                )}
                <ul className={styles.rewards}>
                  {d.awardDetails[group][rank].map(reward => (
                    <li key={reward}>{reward}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className={styles.topTen}>
            <h4>
              <img src={designAssets[`${group}-top-ten`]} alt='' />
              <span>{d.awardDetails.topTen}</span>
            </h4>
            {d.awardDetails[group].topTen.map(row => (
              <ul key={row[0]}>
                {row.map(reward => (
                  <li key={reward}>{reward}</li>
                ))}
              </ul>
            ))}
          </div>
        </section>
      ))}
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.contribution}>
        <img
          className={styles.contributionPattern}
          src={assets['award-img11']}
          alt=''
        />
        <div className={styles.medal} aria-hidden='true'>
          <img
            className={styles.medalOuter}
            src={assets['award-img12']}
            alt=''
          />
          <img
            className={styles.medalInner}
            src={assets['award-img13']}
            alt=''
          />
          <div className={styles.medalGraphic}>
            {[
              'award-imgVector',
              'award-imgVector1',
              'award-imgVector2',
              'award-imgVector3',
              'award-imgVector4',
            ].map(key => (
              <img key={key} src={assets[key as keyof typeof assets]} alt='' />
            ))}
          </div>
        </div>
        <div className={styles.contributionCopy}>
          <h3>{d.contributionAward}</h3>
          <p>{d.contributionAwardHint}</p>
        </div>
      </div>
      <div className={styles.benefits}>
        <span className={styles.benefitIcon}>
          <img src={assets['award-imgGroup']} alt='' />
        </span>
        <div>
          <h3>{d.moreBenefits}</h3>
          <p>
            {d.benefitsHint.split('1,000').map((part, index) => (
              <span key={part}>
                {index > 0 && <strong>1,000</strong>}
                {part}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
