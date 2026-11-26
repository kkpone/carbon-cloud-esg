import { useRef, useState } from 'react';
import { DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, message } from 'antd';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import I18N from '@/lang/I18N';
import { copyToClipboard } from '@/utils/clipboard';
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

type Props = {
  open: boolean;
  payload?: CertificatePosterPayload;
  loading?: boolean;
  onClose: () => void;
};

const TIER_BADGE_CLASS: Record<AwardLevel, string> = {
  GOLD: styles.tierGold,
  SILVER: styles.tierSilver,
  BRONZE: styles.tierBronze,
  COMPLETED: styles.tierCompleted,
};

export default function ResultPosterModal({
  open,
  payload,
  loading = false,
  onClose,
}: Props) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const t = I18N.carbonCompetition;
  const r = t.resultsUi;

  if (!payload) return null;

  const isAward = isMedalTier(payload.awardLevel);
  const certType = isAward
    ? r.certificateTypeAward
    : r.certificateTypeCompletion;
  const trackName =
    payload.scope === 'PERSONAL' ? r.personalTrackName : r.enterpriseTrackName;
  const awardText = getAwardLevelText(payload.awardLevel);
  const bannerText = I18N.template(r.certificateBanner, { type: certType });
  const bodyText = isAward
    ? I18N.template(r.certificateBodyAward, {
        name: payload.recipientName,
        track: trackName,
        award: awardText,
      })
    : I18N.template(r.certificateBodyCompletion, {
        name: payload.recipientName,
        track: trackName,
      });
  const issuedDate = dayjs(payload.issuedAt || undefined).format('YYYY-MM-DD');
  const qrValue =
    payload.inviteUrl && /^https?:\/\//i.test(payload.inviteUrl)
      ? payload.inviteUrl
      : payload.shareUrl && /^https?:\/\//i.test(payload.shareUrl)
      ? payload.shareUrl
      : typeof window !== 'undefined'
      ? window.location.href
      : '';

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
      link.download = `CCMA-${payload.scope.toLowerCase()}-${
        payload.certificateNo
      }.png`;
      link.click();
      message.success(r.posterDownloadSuccess);
    } catch {
      message.error(r.posterDownloadFailed);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const targetUrl =
      payload.shareUrl ||
      (typeof window !== 'undefined' ? window.location.href : '');
    copyToClipboard(targetUrl)
      .then(() => {
        message.success(r.posterLinkCopied);
      })
      .catch(err => {
        message.error(err instanceof Error ? err.message : t.failed);
      });
  };

  return (
    <Modal
      open={open}
      title={
        payload.scope === 'PERSONAL'
          ? r.posterModalTitlePersonal
          : r.posterModalTitleEnterprise
      }
      footer={null}
      width={600}
      centered
      destroyOnClose
      onCancel={onClose}
    >
      <div className={styles.modalBody}>
        <div className={styles.posterStage}>
          <div className={styles.posterCanvas} ref={posterRef}>
            <div className={styles.posterGlowTop} aria-hidden='true' />
            <div className={styles.posterGlowBottom} aria-hidden='true' />
            <div className={styles.certificatePaper}>
              <span
                className={`${styles.cornerMark} ${styles.cornerTL}`}
                aria-hidden='true'
              />
              <span
                className={`${styles.cornerMark} ${styles.cornerTR}`}
                aria-hidden='true'
              />
              <span
                className={`${styles.cornerMark} ${styles.cornerBL}`}
                aria-hidden='true'
              />
              <span
                className={`${styles.cornerMark} ${styles.cornerBR}`}
                aria-hidden='true'
              />

              <div className={styles.header}>
                <img className={styles.logo} src={bannerLogo} alt='CCMA' />
                <div className={styles.bannerTag}>{bannerText}</div>
                <div
                  className={`${styles.tierBadge} ${
                    TIER_BADGE_CLASS[payload.awardLevel]
                  }`}
                >
                  {trackName} · {awardText}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.body}>
                <p className={styles.statement}>{bodyText}</p>
                <p className={styles.encourage}>{r.certificateEncourage}</p>
                {(payload.totalScore != null || payload.ranking != null) && (
                  <div className={styles.scoreStrip}>
                    {payload.ranking != null && (
                      <span>
                        {I18N.template(r.posterRankSummary, {
                          rank: String(payload.ranking),
                        })}
                      </span>
                    )}
                    {payload.totalScore != null && (
                      <span>
                        {I18N.template(r.posterScoreSummary, {
                          score: payload.totalScore.toFixed(2),
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.footer}>
                <div className={styles.meta}>
                  <p className={styles.issuerLine}>
                    {r.certificateIssuer}　{issuedDate}
                  </p>
                  <p className={styles.certNo}>
                    {I18N.template(r.certificateNoLabel, {
                      no: payload.certificateNo,
                    })}
                  </p>
                </div>
                {qrValue ? (
                  <div className={styles.qrBox}>
                    <QRCodeSVG value={qrValue} size={76} />
                    <span className={styles.qrHint}>{r.posterQrHint}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {payload.inviteEnabled === false ? (
          <Alert type='info' showIcon message={t.shareInviteClosed} />
        ) : null}

        <div className={styles.actions}>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            loading={downloading || loading}
            onClick={handleDownload}
          >
            {r.downloadPoster}
          </Button>
          <Button
            icon={<LinkOutlined />}
            disabled={loading}
            onClick={handleCopyLink}
          >
            {r.copyPosterLink}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
