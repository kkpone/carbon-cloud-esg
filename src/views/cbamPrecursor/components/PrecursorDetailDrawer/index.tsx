import I18N from '@src/lang/I18N';
import { Button, Drawer, Empty, Spin, Tooltip } from 'antd';

import { CbamDrawerClose, CbamDrawerTitle } from '@/components/CbamDrawerHeader';
import { downloadFile } from '@/components/DownLoadFile';

import detailFileDownloadIcon from '../../assets/detail-file-download.svg';
import detailFileSuccessIcon from '../../assets/detail-file-success.svg';
import { Precursor, PrecursorFileObject } from '../../types';
import styles from './index.module.less';

interface Props { open: boolean; loading: boolean; detail?: Precursor; onClose: () => void; }
interface DetailCell { label: string; value?: string | number; }
const text = (value?: string | number) => value === undefined || value === null || value === '' ? '-' : String(value);
const valueWithUnit = (value: string | undefined, unit: string) => value ? `${value} ${unit}` : '-';
const formatFileSize = (file: PrecursorFileObject) => {
  if (!file.size) return '-';
  const size = Number(file.size);
  if (file.unit?.toUpperCase() === 'B' && Number.isFinite(size)) {
    const value = (size / 1024).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${value} KB`;
  }
  return `${file.size}${file.unit ? ` ${file.unit}` : ''}`;
};
const DetailTable = ({ items, className = '' }: { items: DetailCell[]; className?: string }) => (
  <div className={`${styles.detailTable} ${className}`}>
    {items.map((item, index) => index % 2 === 0
      ? <div className={styles.labelCell} key={`${item.label}-${index}`}>{item.label}</div>
      : <Tooltip title={text(item.value)} placement='topLeft' key={`${item.label}-${index}`}><div className={styles.valueCell}><span>{text(item.value)}</span></div></Tooltip>)}
  </div>
);

export const PrecursorDetailDrawer = ({ open, loading, detail, onClose }: Props) => {
  const cnDisplayName = [detail?.cnCode, detail?.cnName].filter(Boolean).join(' / ') || '-';
  const verificationPeriod = detail?.verificationStartDate && detail?.verificationEndDate
    ? `${detail.verificationStartDate} ${I18N.cbamPrecursor.dateTo} ${detail.verificationEndDate}`
    : '-';
  const sourceItems: DetailCell[] = detail ? [
    { label: I18N.cbamPrecursor.detailCnCode }, { label: '', value: cnDisplayName },
    { label: I18N.cbamPrecursor.systemName }, { label: '', value: detail.systemName },
    { label: I18N.cbamPrecursor.fillName }, { label: '', value: detail.fillTaskName },
    { label: I18N.cbamPrecursor.collectionType }, { label: '', value: detail.sourceTypeName },
    { label: I18N.cbamPrecursor.sourceSupplier }, { label: '', value: detail.supplierName },
    { label: I18N.cbamPrecursor.sourceCountry }, { label: '', value: detail.countryName },
  ] : [];
  const verificationItems: DetailCell[] = detail ? [
    { label: I18N.cbamPrecursor.reportNo }, { label: '', value: detail.reportNo },
    { label: I18N.cbamPrecursor.verifierName }, { label: '', value: detail.verifierName },
    { label: I18N.cbamPrecursor.reportYear }, { label: '', value: detail.reportYear },
    { label: I18N.cbamPrecursor.issueDate }, { label: '', value: detail.issueDate },
    { label: I18N.cbamPrecursor.verificationPeriod }, { label: '', value: verificationPeriod },
    { label: I18N.cbamPrecursor.expiryDate }, { label: '', value: detail.expiryDate },
  ] : [];
  const emissionItems = detail ? [
    { label: I18N.cbamPrecursor.emissionAmount, value: valueWithUnit(detail.embeddedEmission, 'tCO₂e/t') },
    { label: I18N.cbamPrecursor.directEmissionDetail, value: valueWithUnit(detail.directEmission, 'tCO₂e/t') },
    { label: I18N.cbamPrecursor.indirectEmissionDetail, value: valueWithUnit(detail.indirectEmission, 'tCO₂e/t') },
    { label: I18N.cbamPrecursor.electricityUsageDetail, value: valueWithUnit(detail.electricityUsage, 'MWh') },
    { label: I18N.cbamPrecursor.electricityFactor, value: valueWithUnit(detail.electricityFactor, 'tCO₂e/MWh') },
  ] : [];
  return (
    <Drawer
      rootClassName={styles.drawer}
      title={<CbamDrawerTitle>{detail?.precursorName || I18N.cbamPrecursor.detail}</CbamDrawerTitle>}
      width={720}
      open={open}
      closable={false}
      destroyOnClose
      onClose={onClose}
      extra={<CbamDrawerClose onClick={onClose} />}
      footer={<div className={styles.footer}><Button onClick={onClose}>{I18N.cbamPrecursor.back}</Button></div>}
    >
      <Spin spinning={loading}>
        {!detail ? <Empty /> : (
          <div className={styles.sections}>
            <section className={styles.section}>
              <h3>{I18N.cbamPrecursor.sourceInfo}</h3>
              <DetailTable className={styles.sourceTable} items={sourceItems} />
            </section>
            <section className={styles.section}>
              <h3>{I18N.cbamPrecursor.emissionInfo}</h3>
              <div className={styles.emissionGrid}>
                {emissionItems.map(item => <div className={styles.emissionCard} key={item.label}><span>{item.label}</span><Tooltip title={item.value} placement='topLeft'><strong>{item.value}</strong></Tooltip></div>)}
              </div>
            </section>
            <section className={styles.section}>
              <h3>{I18N.cbamPrecursor.precursorVerificationInfo}</h3>
              <DetailTable className={styles.verificationTable} items={verificationItems} />
            </section>
            <section className={styles.section}>
              <h3>{I18N.cbamPrecursor.verificationFiles}</h3>
              {!detail.files?.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                <div className={styles.fileGrid}>
                  {detail.files.map((file, index) => (
                    <div className={styles.fileCard} key={`${file.url || file.name}-${index}`}>
                      <div className={styles.fileCardTitle}>{I18N.cbamPrecursor.detailReportFiles}</div>
                      <div className={styles.fileInfo}>
                        <div className={styles.fileNameRow}><img src={detailFileSuccessIcon} alt='' /><Tooltip title={file.name || file.url}><strong>{file.name || file.url || '-'}</strong></Tooltip></div>
                        <div className={styles.fileSize}><span>{I18N.cbamPrecursor.fileSize}</span><strong>{formatFileSize(file)}</strong></div>
                      </div>
                      {file.url && <div className={styles.fileActions}>
                        <button type='button' onClick={() => downloadFile(file.name || 'file', file.url || '')}><img src={detailFileDownloadIcon} alt='' />{I18N.cbamPrecursor.download}</button>
                      </div>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </Spin>
    </Drawer>
  );
};
