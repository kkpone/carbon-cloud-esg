import I18N from '@/lang/I18N';
import { Button } from 'antd';
import { useEffect, useRef, useState } from 'react';
import bannerBackground from '@/assets/images/carbonCompetition/banner-background.png';
import bannerBackgroundMobile from '@/assets/images/carbonCompetition/banner-background-mobile.png';
import bannerLogo from '@/assets/images/carbonCompetition/banner-logo.png';
import bannerAccent from '@/assets/images/carbonCompetition/banner-accent.svg';
import floatingRegister from '@/assets/images/carbonCompetition/register-floating.png';
import bannerDivider from '@/assets/images/carbonCompetition/banner-divider.svg';
import { competitionAssets as assets } from '../../assets';
import type { Overview } from '../../types';
import TrackCards from '../TrackCards';
import CompetitionAwards from '../CompetitionAwards';
import CompetitionTimeline from '../CompetitionTimeline';
import CompetitionRules from '../CompetitionRules';
import CompetitionPartners from './components/CompetitionPartners';
import styles from './index.module.less';

const goalIcons = [
  'goal-imgGroup1321314688',
  'goal-imgGroup1321314689',
  'goal-imgGroup1321314690',
  'goal-imgGroup1321314692',
  'goal-imgGroup1321314693',
  'goal-img1',
] as const;
const dimensions = [
  'Calculating',
  'Reducing',
  'Engaging',
  'Offsetting',
  'Spreading',
];
export default function CompetitionIntroduction({
  event,
  onRegister,
}: {
  event: Overview;
  onRegister: () => void;
}) {
  const t = I18N.carbonCompetition;
  const d = t.design;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('competition-background');
  const [showFloatingRegister, setShowFloatingRegister] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const introductionRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const introduction = introductionRef.current;
    const chapters = chaptersRef.current;
    const container = introduction?.closest('main');
    const header = container?.querySelector<HTMLElement>(':scope > header');
    if (!introduction || !chapters || !container || !header) return;
    const sections = Array.from(
      introduction.querySelectorAll<HTMLElement>(':scope > section[id]'),
    );
    let frame = 0;
    let offset = 0;
    const updateActiveSection = () => {
      frame = 0;
      const boundary = container.getBoundingClientRect().top + offset + 16;
      let active = sections[0]?.id || '';
      setShowFloatingRegister(
        (heroRef.current?.getBoundingClientRect().bottom ?? Infinity) <=
          header.getBoundingClientRect().bottom,
      );
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= boundary)
          active = section.id;
      }
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 2
      ) {
        active = sections[sections.length - 1]?.id || active;
      }
      setActiveSection(active);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateActiveSection);
    };
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height;
      const chaptersHeight = chapters.getBoundingClientRect().height;
      offset = headerHeight + chaptersHeight;
      introduction.style.setProperty(
        '--competition-header-height',
        `${headerHeight}px`,
      );
      introduction.style.setProperty(
        '--competition-chapters-height',
        `${chaptersHeight}px`,
      );
      onScroll();
    };
    const observer = new ResizeObserver(measure);
    [
      header,
      chapters,
      ...(heroRef.current ? [heroRef.current] : []),
      ...sections,
    ].forEach(element => observer.observe(element));
    container.addEventListener('scroll', onScroll, { passive: true });
    measure();
    const target = sections.find(
      section => `#${section.id}` === window.location.hash,
    );
    target?.scrollIntoView({ block: 'start' });
    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [event.id]);
  const links = [
    ['background', t.introBackground],
    ['goals', d.goalsTitle],
    ['tracks', t.introTracks],
    ['rules', d.mechanism],
    ['awards', d.awards],
    ['timeline', d.timeline],
    ['partners', d.partners],
  ];
  return (
    <div className={styles.introduction} ref={introductionRef}>
      <section className={styles.hero} ref={heroRef}>
        <picture className={styles.heroBackground}>
          <source media='(max-width: 767px)' srcSet={bannerBackgroundMobile} />
          <img src={bannerBackground} alt='' />
        </picture>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <img src={bannerLogo} alt='CCMA' />
          </div>
          <div className={styles.heroHeading}>
            <p className={styles.heroTagline}>{d.invitationBadge}</p>
            <h1>{event.publicContent.bannerTitle || d.bannerTitle}</h1>
            <p className={styles.heroEnglish}>{d.bannerEnglishTitle}</p>
            <img src={bannerAccent} alt='' width={134} height={34} />
            {event.publicContent.bannerSubtitle?.trim() && (
              <p className={styles.heroDescription}>
                {event.publicContent.bannerSubtitle}
              </p>
            )}
          </div>
          <div className={styles.heroHighlights}>
            {d.bannerHighlights.map((item, index) => (
              <div className={styles.heroHighlight} key={item.title}>
                {index > 0 && (
                  <img src={bannerDivider} alt='' width={1} height={50} />
                )}
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              </div>
            ))}
          </div>
          <Button
            className={styles.heroRegister}
            type='primary'
            onClick={onRegister}
          >
            {d.registerNow}
          </Button>
        </div>
      </section>
      <nav className={styles.chapters} aria-label={d.intro} ref={chaptersRef}>
        {links.map(([id, label]) => (
          <a
            key={id}
            href={`#competition-${id}`}
            className={
              activeSection === `competition-${id}`
                ? styles.activeChapter
                : undefined
            }
            aria-current={
              activeSection === `competition-${id}` ? 'location' : undefined
            }
          >
            {label}
          </a>
        ))}
      </nav>
      <section
        id='competition-background'
        className={`${styles.section} ${styles.backgroundSection}`}
      >
        <h2>{t.introBackground}</h2>
        <div className={styles.background}>
          {(event.publicContent.backgroundText
            ? event.publicContent.backgroundText.split('\n')
            : d.background
          ).map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
      <section
        id='competition-goals'
        className={`${styles.section} ${styles.tinted}`}
      >
        <h2>{d.goalsTitle}</h2>
        <p className={styles.subtitle}>{d.goalsHint}</p>
        <div className={styles.goals}>
          {(event.publicContent.goals?.length
            ? event.publicContent.goals.map(title => ({ title, text: '' }))
            : d.goals
          ).map((goal, index) => (
            <article key={goal.title}>
              <div className={styles.goalIcon}>
                <img src={assets[goalIcons[index % goalIcons.length]]} alt='' />
              </div>
              <h3>{goal.title}</h3>
              {goal.text && <p>{goal.text}</p>}
            </article>
          ))}
        </div>
      </section>
      <section id='competition-tracks' className={styles.section}>
        <h2>{t.introTracks}</h2>
        <TrackCards />
      </section>
      <section
        id='competition-rules'
        className={`${styles.section} ${styles.rules}`}
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2>{d.mechanism}</h2>
            <p className={styles.subtitle}>{d.mechanismHint}</p>
          </div>
          <Button onClick={() => setRulesOpen(true)}>{d.fullRules}</Button>
        </div>
        <div className={styles.mechanismVisual}>
          <div className={styles.dimensions}>
            {d.dimensions.map((item, index) => (
              <article key={dimensions[index]}>
                <h3>{dimensions[index]}</h3>
                <img
                  src={assets['mechanism-imgVector2737']}
                  alt=''
                  width={26}
                  height={2}
                />
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className={styles.wave}>
            <img
              className={styles.curve}
              src={assets['mechanism-img']}
              alt=''
              width={1104}
              height={115}
            />
            {'CREOS'.split('').map((letter, index) => (
              <div
                key={letter}
                className={index % 2 ? styles.high : styles.low}
              >
                <span>
                  <img
                    src={assets['mechanism-img1']}
                    alt=''
                    width={54}
                    height={54}
                  />
                  <img
                    src={assets['mechanism-img2']}
                    alt=''
                    width={46}
                    height={46}
                  />
                  <b>{letter}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
        <h3 className={styles.stageTitle}>{d.stages}</h3>
        <div className={styles.stages}>
          <article>
            <h3>
              {d.preliminary}
              <span className={styles.stageNote}>{d.preliminaryNote}</span>
            </h3>
            <p>{d.preliminaryHint}</p>
          </article>
          <article>
            <h3>{d.final}</h3>
            <p>{d.finalHint}</p>
          </article>
        </div>
      </section>
      <section
        id='competition-awards'
        className={`${styles.section} ${styles.awardsSection}`}
      >
        <h2>{d.awards}</h2>
        <CompetitionAwards description={event.publicContent.awardDescription} />
      </section>
      <section
        id='competition-timeline'
        className={`${styles.section} ${styles.tinted}`}
      >
        <h2>{d.timeline}</h2>
        <CompetitionTimeline phases={event.phases} />
      </section>
      <section id='competition-partners' className={styles.section}>
        <h2>{d.partners}</h2>
        <CompetitionPartners />
      </section>
      {showFloatingRegister && event.registrationAvailable && !rulesOpen && (
        <div className={styles.floatingRegistration}>
          <button
            type='button'
            className={styles.floatingRegister}
            onClick={onRegister}
          >
            <img src={floatingRegister} alt='' width={272} height={90} />
            <span>{d.registerNow}</span>
          </button>
        </div>
      )}
      <CompetitionRules
        open={rulesOpen}
        event={event}
        onClose={() => setRulesOpen(false)}
        onRegister={() => {
          setRulesOpen(false);
          onRegister();
        }}
      />
    </div>
  );
}
