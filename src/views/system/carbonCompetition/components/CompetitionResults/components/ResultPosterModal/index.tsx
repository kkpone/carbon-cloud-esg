import { useEffect, useRef, useState } from 'react';
import { DownloadOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, Modal, Tabs, message } from 'antd';
import html2canvas from 'html2canvas';
import I18N from '@/lang/I18N';
import bannerLogo from '@/assets/images/carbonCompetition/banner-logo.png';
import { getAwardLevelText, isMedalTier } from '../../../../awards';
import type { AwardLevel } from '../../../../types';
import styles from './index.module.less';

export type CertificatePosterPayload = {
  scope: 'PERSONAL' | 'ENTERPRISE';
  recipientName: string;
  awardLevel: AwardLevel;
  certificateNo: string;
  issuedAt?: string;
  ranking?: number;
  totalScore?: number;
  shareUrl?: string;
  inviteUrl?: string;
  inviteEnabled?: boolean;
};

type PersonalCertificateMode = 'AWARD' | 'COMPLETION';

type Props = {
  open: boolean;
  payload?: CertificatePosterPayload;
  loading?: boolean;
  onClose: () => void;
};

export default function ResultPosterModal({
  open,
  payload,
  loading = false,
  onClose,
}: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const defaultPersonalMode: PersonalCertificateMode =
    payload &&
    ((payload.ranking != null && payload.ranking <= 10) ||
      isMedalTier(payload.awardLevel))
      ? 'AWARD'
      : 'COMPLETION';
  const [personalMode, setPersonalMode] =
    useState<PersonalCertificateMode>(defaultPersonalMode);

  useEffect(() => {
    setPersonalMode(defaultPersonalMode);
  }, [defaultPersonalMode, payload?.recipientName, payload?.ranking]);

  const t = I18N.carbonCompetition;
  const r = t.resultsUi;

  if (!payload) return null;

  const isEnterprise = payload.scope === 'ENTERPRISE';
  const isAwardPersonal = personalMode === 'AWARD';
  const awardText = isMedalTier(payload.awardLevel)
    ? getAwardLevelText(payload.awardLevel)
    : r.certificateTopTenAward;

  const personalRanking = isAwardPersonal
    ? payload.ranking != null && payload.ranking <= 10
      ? payload.ranking
      : 1
    : payload.ranking;

  const handleDownload = async () => {
    if (!posterRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      const suffix = isEnterprise
        ? 'enterprise-poster'
        : isAwardPersonal
        ? 'personal-award-cert'
        : 'personal-completion-cert';
      link.download = `CCMA-${suffix}-${payload.certificateNo}.png`;
      link.click();
      message.success(r.posterDownloadSuccess);
    } catch {
      message.error(r.posterDownloadFailed);
    } finally {
      setDownloading(false);
    }
  };

  const renderPersonalAwardCertificate = () => {
    const bannerText = I18N.template(r.certificateBanner, {
      type: r.certificateTypeAward,
    });
    const bodyText = I18N.template(r.certificateBodyAward, {
      name: payload.recipientName,
      track: r.personalTrackName,
      award: awardText,
    });

    return (
      <div
        className={`${styles.posterCanvas} ${styles.awardCanvas}`}
        ref={posterRef}
      >
        <div className={styles.awardGlowTop} aria-hidden='true' />
        <div className={styles.awardGlowBottom} aria-hidden='true' />
        <div className={`${styles.certificatePaper} ${styles.awardPaper}`}>
          <span
            className={`${styles.cornerMark} ${styles.cornerTL} ${styles.cornerGold}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerTR} ${styles.cornerGold}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerBL} ${styles.cornerGold}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerBR} ${styles.cornerGold}`}
            aria-hidden='true'
          />

          <div className={styles.header}>
            <img className={styles.logo} src={bannerLogo} alt='CCMA' />
            <div className={styles.awardBannerTag}>{bannerText}</div>
            <div className={styles.awardEmblem}>
              <TrophyOutlined />
              <span>
                {r.personalTrackName} · {awardText}
              </span>
            </div>
          </div>

          <div className={styles.awardDivider} />

          <div className={styles.body}>
            <p className={styles.statement}>{bodyText}</p>
            <p className={styles.encourage}>{r.certificateEncourage}</p>
            {personalRanking != null ? (
              <div className={styles.awardRankStrip}>
                <span>
                  {I18N.template(r.posterRankSummary, {
                    rank: String(personalRanking),
                  })}
                </span>
              </div>
            ) : null}
          </div>

          <div className={styles.footer}>
            <div className={styles.meta}>
              <p className={styles.issuerLine}>{r.certificateIssuer}</p>
              <p className={styles.certNo}>
                {I18N.template(r.certificateNoLabel, {
                  no: payload.certificateNo,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPersonalCompletionCertificate = () => {
    const bannerText = I18N.template(r.certificateBanner, {
      type: r.certificateTypeCompletion,
    });
    const bodyText = I18N.template(r.certificateBodyCompletion, {
      name: payload.recipientName,
      track: r.personalTrackName,
    });

    return (
      <div
        className={`${styles.posterCanvas} ${styles.completionCanvas}`}
        ref={posterRef}
      >
        <div className={styles.completionGlowTop} aria-hidden='true' />
        <div className={styles.completionGlowBottom} aria-hidden='true' />
        <div className={`${styles.certificatePaper} ${styles.completionPaper}`}>
          <span
            className={`${styles.cornerMark} ${styles.cornerTL} ${styles.cornerTeal}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerTR} ${styles.cornerTeal}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerBL} ${styles.cornerTeal}`}
            aria-hidden='true'
          />
          <span
            className={`${styles.cornerMark} ${styles.cornerBR} ${styles.cornerTeal}`}
            aria-hidden='true'
          />

          <div className={styles.header}>
            <img className={styles.logo} src={bannerLogo} alt='CCMA' />
            <div className={styles.completionBannerTag}>{bannerText}</div>
            <div className={styles.completionEmblem}>
              {r.personalTrackName} · {r.completedAward}
            </div>
          </div>

          <div className={styles.completionDivider} />

          <div className={styles.body}>
            <p className={styles.statement}>{bodyText}</p>
            <p className={styles.encourage}>{r.certificateEncourage}</p>
            {payload.ranking != null ? (
              <div className={styles.completionRankStrip}>
                <span>
                  {I18N.template(r.posterRankSummary, {
                    rank: String(payload.ranking),
                  })}
                </span>
              </div>
            ) : null}
          </div>

          <div className={styles.footer}>
            <div className={styles.meta}>
              <p className={styles.issuerLine}>{r.certificateIssuer}</p>
              <p className={styles.certNo}>
                {I18N.template(r.certificateNoLabel, {
                  no: payload.certificateNo,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEnterpriseSharePoster = () => {
    const isEnterpriseMedal = isMedalTier(payload.awardLevel);
    const enterpriseAwardText = getAwardLevelText(payload.awardLevel);
    const bodyText = isEnterpriseMedal
      ? I18N.template(r.enterprisePosterBodyFinal, {
          name: payload.recipientName,
          award: enterpriseAwardText,
        })
      : I18N.template(r.enterprisePosterBodyRanked, {
          name: payload.recipientName,
        });

    return (
      <div
        className={`${styles.posterCanvas} ${styles.enterprisePosterCanvas}`}
        ref={posterRef}
      >
        <div className={styles.enterpriseGlowTop} aria-hidden='true' />
        <div className={styles.enterpriseGlowBottom} aria-hidden='true' />
        <div className={styles.enterpriseCard}>
          <div className={styles.enterpriseTop}>
            <img className={styles.logo} src={bannerLogo} alt='CCMA' />
            <span className={styles.enterpriseKicker}>
              {r.enterprisePosterTag}
            </span>
          </div>

          <h2 className={styles.enterpriseTitle}>{r.enterprisePosterBanner}</h2>

          <div className={styles.enterpriseHero}>
            <div className={styles.enterpriseCompany}>
              {payload.recipientName}
            </div>
            <div className={styles.enterpriseBadges}>
              {payload.ranking != null ? (
                <span className={styles.enterpriseRankPill}>
                  {I18N.template(r.posterRankSummary, {
                    rank: String(payload.ranking),
                  })}
                </span>
              ) : null}
              {isEnterpriseMedal ? (
                <span className={styles.enterpriseAwardPill}>
                  <TrophyOutlined />
                  <span>{enterpriseAwardText}</span>
                </span>
              ) : null}
            </div>
          </div>

          <p className={styles.enterpriseStatement}>{bodyText}</p>
          <p className={styles.enterpriseSlogan}>{r.enterprisePosterSlogan}</p>

          <div className={styles.enterpriseFooter}>
            <span>{r.certificateIssuer}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      title={
        isEnterprise ? r.posterModalTitleEnterprise : r.posterModalTitlePersonal
      }
      footer={null}
      width={600}
      centered
      destroyOnClose
      onCancel={onClose}
    >
      <div className={styles.modalBody}>
        {!isEnterprise ? (
          <Tabs
            className={styles.certTabs}
            centered
            activeKey={personalMode}
            onChange={key => setPersonalMode(key as PersonalCertificateMode)}
            items={[
              { key: 'AWARD', label: r.certificateTabAward },
              { key: 'COMPLETION', label: r.certificateTabCompletion },
            ]}
          />
        ) : null}

        <div className={styles.posterStage}>
          {isEnterprise
            ? renderEnterpriseSharePoster()
            : isAwardPersonal
            ? renderPersonalAwardCertificate()
            : renderPersonalCompletionCertificate()}
        </div>

        <div className={styles.actions}>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            loading={downloading || loading}
            onClick={handleDownload}
          >
            {r.downloadPoster}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
