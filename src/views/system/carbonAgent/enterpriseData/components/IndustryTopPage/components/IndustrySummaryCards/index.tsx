import I18N from '@src/lang/I18N';

import { displayUnit, formatDecimal } from '../../../../data';
import style from './index.module.less';

type IndustrySummaryCardsProps = {
  total: number;
  disclosedCount: number;
  medianEmissions?: string | null;
  medianUnit?: string | null;
};

const IndustrySummaryCards = ({
  total,
  disclosedCount,
  medianEmissions,
  medianUnit,
}: IndustrySummaryCardsProps) => {
  const t = I18N.enterpriseData;
  const disclosureRate =
    total > 0 ? `${Math.round((disclosedCount / total) * 100)}%` : '—';

  return (
    <div className={style.grid}>
      <div className={style.card}>
        <span className={style.label}>{t.industryTopMetricTotal}</span>
        <strong className={style.value}>
          {I18N.template(t.industryTopCompanyCount, { count: total })}
        </strong>
      </div>
      <div className={style.card}>
        <span className={style.label}>{t.industryTopMetricDisclosed}</span>
        <strong className={style.value}>
          {I18N.template(t.industryTopCompanyCount, { count: disclosedCount })}
        </strong>
      </div>
      <div className={style.card}>
        <span className={style.label}>{t.industryTopMetricDisclosureRate}</span>
        <strong className={style.value}>{disclosureRate}</strong>
      </div>
      <div className={style.card}>
        <span className={style.label}>{t.industryTopMetricMedian}</span>
        <strong className={style.value}>
          {medianEmissions ? formatDecimal(medianEmissions) : '—'}
          {medianEmissions && medianUnit ? (
            <span className={style.unit}>{displayUnit(medianUnit)}</span>
          ) : null}
        </strong>
      </div>
    </div>
  );
};

export default IndustrySummaryCards;
