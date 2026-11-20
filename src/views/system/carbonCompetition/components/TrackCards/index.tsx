import enterpriseImage from '@/assets/images/carbonCompetition/track-imgTrackEnterpriseWebp.png';
import individualImage from '@/assets/images/carbonCompetition/track-imgTrackIndividualWebp.png';
import noticeFlag from '@/assets/images/carbonCompetition/track-img.svg';
import I18N from '@/lang/I18N';
import { Button } from 'antd';
import styles from './index.module.less';

export type RegistrationTrack = 'ENTERPRISE' | 'INDIVIDUAL';

export default function TrackCards({
  onSelect,
  disabled = false,
}: {
  onSelect?: (track: RegistrationTrack) => void;
  disabled?: boolean;
}) {
  const t = I18N.carbonCompetition.design;
  const tracks = [
    {
      key: 'ENTERPRISE' as const,
      title: t.enterprise,
      size: t.enterpriseSize,
      image: enterpriseImage,
      audience: t.enterpriseAudience,
      method: t.enterpriseMethod,
      task: t.enterpriseTask,
    },
    {
      key: 'INDIVIDUAL' as const,
      title: t.individual,
      size: t.individualSize,
      image: individualImage,
      audience: t.individualAudience,
      method: t.individualMethod,
      task: t.individualTask,
    },
  ];
  return (
    <div className={styles.tracks}>
      {tracks.map(track => (
        <article key={track.key} className={styles.card}>
          <div
            className={`${styles.visual} ${
              track.key === 'INDIVIDUAL' ? styles.individual : ''
            }`}
          >
            <div className={styles.heading}>
              <h3>{track.title}</h3>
              <span>{track.size}</span>
            </div>
            <img
              loading='lazy'
              src={track.image}
              alt=''
              width={268}
              height={142}
            />
          </div>
          <dl className={styles.details}>
            {[
              [t.audience, track.audience],
              [t.method, track.method],
              [
                track.key === 'INDIVIDUAL' ? t.individualTaskLabel : t.task,
                track.task,
              ],
              ...(onSelect
                ? [
                    [
                      track.key === 'ENTERPRISE'
                        ? t.teamRequirements
                        : t.individualRequirements,
                      track.key === 'ENTERPRISE'
                        ? t.teamRequirementsHint
                        : t.individualRequirementsHint,
                    ],
                  ]
                : []),
            ].map(([label, text]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          {onSelect && (
            <div className={styles.action}>
              <Button
                type='primary'
                block
                disabled={disabled}
                onClick={() => onSelect(track.key)}
              >
                {track.key === 'ENTERPRISE'
                  ? t.registerEnterprise
                  : t.registerIndividual}
              </Button>
            </div>
          )}
        </article>
      ))}
      <p className={styles.trackNotice}>
        <img src={noticeFlag} alt='' />
        <span>
          {I18N.template(t.trackNoticeLabel, { notice: t.trackNotice })}
        </span>
      </p>
    </div>
  );
}
