import I18N, { getCurrentLocale } from '@/lang/I18N';
import { designAssets as assets } from './designAssets';
import styles from './index.module.less';

export default function CompetitionPartners() {
  const t = I18N.carbonCompetition.design.partnerSection;
  return (
    <div className={styles.section}>
      <p className={styles.description}>{t.hint}</p>
      <div className={styles.layout}>
        <div className={styles.organizations}>
          <article className={styles.card}>
            <h3>{t.organizer}</h3>
            <div className={styles.logos}>
              <div className={styles.logoTile}>
                <div className={`${styles.logo} ${styles.carbonstop}`}>
                  <img src={assets.carbonstop} alt={t.logos.carbonstop} />
                </div>
              </div>
            </div>
          </article>
          <article className={styles.card}>
            <h3>{t.coorganizers}</h3>
            <div className={styles.logos}>
              {(
                [
                  'cafeec',
                  'tsinghua',
                  'sichuan',
                  'guangdong',
                  'cec',
                  'sgs',
                  'tantao',
                ] as const
              ).map(logo => (
                <div className={styles.logoTile} key={logo}>
                  <div className={`${styles.logo} ${styles[logo]}`}>
                    <img src={assets[logo]} alt={t.logos[logo]} />
                  </div>
                </div>
              ))}
              <div className={styles.logoTile}>
                <div className={styles.database} lang={getCurrentLocale()}>
                  <img src={assets.cpcd} alt='' />
                  <div>
                    <strong>{t.cpcd}</strong>
                    <span>{t.cpcdEnglish}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
          <article className={styles.card}>
            <h3>{t.partners}</h3>
            <div className={styles.logos}>
              {(
                [
                  ['green-investment', 'greenInvestment'],
                  ['for-good', 'forGood'],
                  ['tantongtong', 'tantongtong'],
                  ['tanjia', 'tanjia'],
                  ['chongqing', 'chongqing'],
                  ['sief', 'sief'],
                ] as const
              ).map(([asset, label]) => (
                <div className={styles.logoTile} key={asset}>
                  <div className={`${styles.logo} ${styles[label]}`}>
                    <img src={assets[asset]} alt={t.logos[label]} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
        <aside className={styles.experts}>
          {[
            { title: t.advisors, people: t.advisorList },
            { title: t.reviewers, people: t.reviewerList },
          ].map(group => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.people.map(person => (
                  <li key={person.name}>
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className={styles.orderHint}>{t.orderHint}</p>
        </aside>
      </div>
    </div>
  );
}
