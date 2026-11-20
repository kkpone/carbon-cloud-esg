import I18N from '@/lang/I18N';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import infoIcon from '@/assets/images/carbonCompetition/timeline-info.svg';
import type { Phase } from '../../types';
import styles from './index.module.less';

dayjs.extend(utc);

const nodes = [
  { key: 'registrationOpen', phase: 'REGISTRATION', field: 'opensAt' },
  { key: 'training', phase: 'TRAINING', field: 'opensAt' },
  {
    key: 'registrationClose',
    phase: 'REGISTRATION',
    field: 'closesAt',
    highlighted: true,
  },
  { key: 'product', phase: 'C_PRODUCT', field: 'range' },
  { key: 'enterprise', phase: 'C_ENTERPRISE', field: 'range' },
  { key: 'review', phase: 'PRELIMINARY_REVIEW', field: 'range' },
  {
    key: 'preliminary',
    phase: 'PRELIMINARY_PUBLISH',
    field: 'publishNotBefore',
    highlighted: true,
  },
  { key: 'final', phase: 'FINAL', field: 'range' },
  { key: 'results', phase: 'FINAL_PUBLISH', field: 'publishNotBefore' },
] as const;

const date = (value: string, format = 'MM.DD') =>
  dayjs(value).utcOffset(480).format(format);

export default function CompetitionTimeline({ phases }: { phases: Phase[] }) {
  const t = I18N.carbonCompetition;
  const d = t.design;
  const registration = phases.find(
    phase => phase.code === 'REGISTRATION' && phase.enabled && phase.confirmed,
  );
  const cards = nodes.map(node => {
    const phase = phases.find(
      item => item.code === node.phase && item.enabled && item.confirmed,
    );
    const start = node.field === 'range' ? phase?.opensAt : phase?.[node.field];
    const end = node.field === 'range' ? phase?.closesAt : undefined;
    const ready = !!start && (node.field !== 'range' || !!end);
    const crossYear = start && end && date(start, 'YYYY') !== date(end, 'YYYY');
    const format = crossYear ? 'YYYY.MM.DD' : 'MM.DD';
    let displayedDate = t.pending;
    let exactDate = '';
    if (ready && start) {
      displayedDate = date(start, format);
      exactDate = date(start, 'YYYY.MM.DD HH:mm:ss');
      if (end) {
        if (date(start, 'YYYY-MM-DD') !== date(end, 'YYYY-MM-DD'))
          displayedDate += ` - ${date(end, format)}`;
        exactDate += ` — ${date(end, 'YYYY.MM.DD HH:mm:ss')}`;
      }
    }
    const text = d.timelineNodes[node.key];
    return (
      <li
        key={node.key}
        className={'highlighted' in node ? styles.highlighted : undefined}
      >
        <time
          className={ready ? styles.date : styles.pending}
          dateTime={ready ? start : undefined}
          title={exactDate}
        >
          {displayedDate}
        </time>
        <div>
          <h3>{text.title}</h3>
          <p>
            {node.key === 'registrationOpen'
              ? I18N.template(text.description, {
                  deadline: registration?.closesAt
                    ? date(registration.closesAt)
                    : t.pending,
                })
              : text.description}
          </p>
        </div>
      </li>
    );
  });
  return (
    <div className={styles.timeline}>
      <div className={styles.path}>
        <ol className={styles.firstRow}>{cards.slice(0, 5)}</ol>
        <ol className={styles.secondRow} start={6}>
          {cards.slice(5)}
        </ol>
      </div>
      <p className={styles.hint}>
        <img src={infoIcon} alt='' width={16} height={16} />
        {d.timelineHint}
      </p>
    </div>
  );
}
