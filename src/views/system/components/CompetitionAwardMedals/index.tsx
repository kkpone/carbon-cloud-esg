import { Tooltip } from 'antd';
import I18N from '@/lang/I18N';
import type { CompetitionAwardMedal } from '../../carbonCompetition/types';
import { getAwardLevelText } from '../../carbonCompetition/awards';
import styles from './index.module.less';

type Props = {
  personal?: CompetitionAwardMedal;
  enterprise?: CompetitionAwardMedal;
  compact?: boolean;
};

const TIER_CLASS = {
  GOLD: styles.gold,
  SILVER: styles.silver,
  BRONZE: styles.bronze,
} as const;

const TIER_COLORS = {
  GOLD: { fill: '#F3B73F', stroke: '#B97808', ribbon: '#D98E0F' },
  SILVER: { fill: '#9BB6D6', stroke: '#4A6E99', ribbon: '#6087B5' },
  BRONZE: { fill: '#D98852', stroke: '#954B1D', ribbon: '#B86431' },
} as const;

function MedalGlyph({
  scope,
  level,
}: {
  scope: CompetitionAwardMedal['scope'];
  level: CompetitionAwardMedal['level'];
}) {
  const palette = TIER_COLORS[level];
  if (scope === 'ENTERPRISE') {
    return (
      <svg
        className={styles.icon}
        viewBox='0 0 16 16'
        fill='none'
        aria-hidden='true'
      >
        <path
          d='M8 1.4L13.6 3.7V7.7C13.6 11.1 11.2 13.7 8 14.8C4.8 13.7 2.4 11.1 2.4 7.7V3.7L8 1.4Z'
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth='1.1'
        />
        <path
          d='M8 4.4L8.95 6.32L11.06 6.62L9.53 8.11L9.89 10.22L8 9.22L6.11 10.22L6.47 8.11L4.94 6.62L7.05 6.32L8 4.4Z'
          fill='#FFFFFF'
        />
      </svg>
    );
  }
  return (
    <svg
      className={styles.icon}
      viewBox='0 0 16 16'
      fill='none'
      aria-hidden='true'
    >
      <path d='M5 9.8L3.7 14.5L6.8 13.1L8 14.6V9.8H5Z' fill={palette.ribbon} />
      <path
        d='M11 9.8L12.3 14.5L9.2 13.1L8 14.6V9.8H11Z'
        fill={palette.ribbon}
      />
      <circle
        cx='8'
        cy='6.3'
        r='4.6'
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth='1.1'
      />
      <path
        d='M8 3.6L8.78 5.18L10.52 5.43L9.26 6.66L9.56 8.4L8 7.58L6.44 8.4L6.74 6.66L5.48 5.43L7.22 5.18L8 3.6Z'
        fill='#FFFFFF'
      />
    </svg>
  );
}

export default function CompetitionAwardMedals({
  personal,
  enterprise,
  compact = false,
}: Props) {
  const list = [personal, enterprise].filter(
    (item): item is CompetitionAwardMedal => Boolean(item),
  );
  if (list.length === 0) return null;

  const r = I18N.carbonCompetition.resultsUi;
  return (
    <span className={styles.medals}>
      {list.map(medal => {
        const awardText = getAwardLevelText(medal.level);
        const tooltip =
          medal.scope === 'PERSONAL'
            ? I18N.template(r.personalMedalTooltip, { award: awardText })
            : I18N.template(r.enterpriseMedalTooltip, {
                award: awardText,
                company: medal.recipientName,
              });
        return (
          <Tooltip key={`${medal.scope}-${medal.level}`} title={tooltip}>
            <span
              className={`${styles.medal} ${TIER_CLASS[medal.level]} ${
                compact ? styles.compact : ''
              }`}
              aria-label={tooltip}
            >
              <MedalGlyph scope={medal.scope} level={medal.level} />
              <span>{medal.title}</span>
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}
