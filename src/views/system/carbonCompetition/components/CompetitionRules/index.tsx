import { Button, Modal } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import I18N from '@/lang/I18N';
import mint from '@/assets/images/carbonCompetition/rules-mint.svg';
import cyan from '@/assets/images/carbonCompetition/rules-cyan.svg';
import grass from '@/assets/images/carbonCompetition/rules-grass.svg';
import close from '@/assets/images/carbonCompetition/rules-close.svg';
import type { Overview } from '../../types';
import RulesTable from './components/RulesTable';
import styles from './index.module.less';

dayjs.extend(utc);

type Props = {
  open: boolean;
  event: Overview;
  onClose: () => void;
  onRegister?: () => void;
  disclaimer?: boolean;
};

export default function CompetitionRules({
  open,
  event,
  onClose,
  onRegister,
  disclaimer = false,
}: Props) {
  const d = I18N.carbonCompetition.design;
  const { rules, legal } = d;
  const sections = disclaimer ? legal.sections : rules.sections;
  const formatDeadline = (value?: string) =>
    value && dayjs(value).isValid()
      ? dayjs(value).utcOffset(480).format('YYYY.MM.DD HH:mm')
      : d.schedulePending;
  const deadline = (
    code: string,
    range = false,
    field:
      | 'opensAt'
      | 'closesAt'
      | 'questionReleaseAt'
      | 'publishNotBefore' = 'closesAt',
  ) => {
    const phase = event.phases.find(
      item => item.code === code && item.enabled && item.confirmed,
    );
    const end = phase?.[field];
    const start = phase?.opensAt;
    if (
      !end ||
      !dayjs(end).isValid() ||
      (range && (!start || !dayjs(start).isValid()))
    )
      return d.schedulePending;
    const endText = dayjs(end).utcOffset(480).format('YYYY.MM.DD HH:mm');
    if (!range) return endText;
    return `${dayjs(start)
      .utcOffset(480)
      .format('YYYY.MM.DD HH:mm')} – ${endText}`;
  };
  const dates = {
    registrationWindow: deadline('REGISTRATION', true),
    registrationDeadline: deadline('REGISTRATION'),
    invitationDeadline: formatDeadline(event.inviteRecordedBefore),
    accountDeadline: formatDeadline(event.accountRegisteredBefore),
    productWindow: deadline('C_PRODUCT', true),
    enterpriseWindow: deadline('C_ENTERPRISE', true),
    checkinWindow: deadline('E_CHECKIN', true),
    finalWindow: deadline('FINAL', true),
    trainingDate: deadline('TRAINING', false, 'opensAt'),
    productRelease: deadline('C_PRODUCT', false, 'questionReleaseAt'),
    reviewWindow: deadline('PRELIMINARY_REVIEW', true),
    preliminaryDate: deadline('PRELIMINARY_PUBLISH', false, 'publishNotBefore'),
    finalPublishDate: deadline('FINAL_PUBLISH', false, 'publishNotBefore'),
    officialNotice: rules.officialNotice,
  };
  return (
    <Modal
      open={open}
      width={1080}
      centered
      destroyOnClose
      closable={false}
      onCancel={onClose}
      className={styles.modal}
      styles={{
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
        header: { margin: 0 },
        footer: { margin: 0 },
      }}
      title={
        <div className={styles.heading}>
          <h2>{disclaimer ? legal.disclaimerTitle : rules.title}</h2>
          <button
            type='button'
            aria-label={disclaimer ? legal.close : rules.close}
            onClick={onClose}
          >
            <img src={close} alt='' />
          </button>
        </div>
      }
      footer={
        <Button
          type='primary'
          disabled={!!onRegister && !event.registrationAvailable}
          onClick={onRegister || onClose}
        >
          {I18N.common.actions.confirm}
        </Button>
      }
    >
      <div className={styles.decoration} aria-hidden='true'>
        <img src={mint} className={styles.mint} alt='' />
        <img src={cyan} className={styles.cyan} alt='' />
        <img src={grass} className={styles.grass} alt='' />
      </div>
      <div className={styles.content}>
        {disclaimer &&
          legal.introduction.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        {sections.map((section, sectionIndex) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            {!disclaimer && sectionIndex === 2 && (
              <RulesTable
                table={rules.schedule}
                dates={dates}
                title={section.title}
              />
            )}
            <div className={styles.paragraphs}>
              {section.paragraphs.map(paragraph => (
                <p key={paragraph}>
                  {Array.from(
                    I18N.template(paragraph, dates).matchAll(
                      /\*\*([^*]+)\*\*|([^*]+|\*)/g,
                    ),
                    match =>
                      match[1] ? (
                        <strong key={match.index}>{match[1]}</strong>
                      ) : (
                        match[0]
                      ),
                  )}
                </p>
              ))}
              {!disclaimer && sectionIndex === 0 && (
                <p className={styles.scheduleNote}>{rules.scheduleNote}</p>
              )}
            </div>
            {!disclaimer && sectionIndex === 5 && (
              <div className={styles.awards}>
                {rules.awards.map(award => (
                  <div key={award.title}>
                    <h4>{award.title}</h4>
                    <RulesTable
                      table={award}
                      dates={dates}
                      title={award.title}
                    />
                  </div>
                ))}
                <div className={styles.paragraphs}>
                  <h4>{rules.benefits.title}</h4>
                  {rules.benefits.paragraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
        {!disclaimer && event.publicContent.publicRuleText?.trim() && (
          <div className={styles.supplement}>
            <h3>{rules.supplement}</h3>
            <p>{event.publicContent.publicRuleText}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
