import I18N from '@/lang/I18N';
import { list, record, text } from '../../../../../../protocol';
import type { Data } from '../../../../../../protocol';
import { useObjectKeys } from '../../../../../../useObjectKeys';
import styles from './index.module.less';

export default function ModelingReview({
  action,
  payload,
}: {
  action: Data;
  payload: Data;
}) {
  const { keyFor } = useObjectKeys();
  const args = record(action.args);
  const display = list(payload.displayActionRequests).find(
    item => item.actionName === action.name,
  );
  const sources = list(args.emissionSources);
  return (
    <div className={styles.review}>
      <dl>
        <div>
          <dt>{I18N.carbonFootprint3.product}</dt>
          <dd>{text(args.productName) || '—'}</dd>
        </div>
        <div>
          <dt>{I18N.carbonAgent.accountName}</dt>
          <dd>{text(args.accountName) || '—'}</dd>
        </div>
        <div>
          <dt>{I18N.carbonAgent.functionalUnit}</dt>
          <dd>
            {text(args.amount)} {text(args.unitName)}
          </dd>
        </div>
        {list(display?.fields).map(field => (
          <div key={text(field.key)}>
            <dt>{text(field.label)}</dt>
            <dd>{text(field.displayValue || field.value)}</dd>
          </div>
        ))}
      </dl>
      {!!args.productDesc && <p>{text(args.productDesc)}</p>}
      <details>
        <summary>
          {I18N.template(I18N.carbonAgent.sourceCount, {
            count: sources.length,
          })}
        </summary>
        {sources.map(source => {
          const factor = record(source.factor);
          return (
            <div
              className={styles.source}
              key={text(source.clientSourceId) || keyFor(source)}
            >
              <div className={styles.sourceHeader}>
                <b>{text(source.name)}</b>
                <span>
                  {text(source.amount)} {text(source.unitName)}
                </span>
              </div>
              <p>
                {I18N.template(I18N.carbonAgent.factorDetail, {
                  factor:
                    text(factor.name) ||
                    (factor.factorId
                      ? I18N.carbonAgent.factorSelected
                      : I18N.carbonAgent.factorPending),
                })}
              </p>
              {!!factor.factor && (
                <p>
                  {text(factor.factor)} {text(factor.unit)}
                </p>
              )}
              {!!factor.reason && <p>{text(factor.reason)}</p>}
              {!!source.remark && <p>{text(source.remark)}</p>}
              {list(source.transport).map(transport => (
                <p key={keyFor(transport)}>
                  {text(transport.name)} · {text(transport.distance)}{' '}
                  {text(transport.distUnitName)}
                  {transport.remark ? ` · ${text(transport.remark)}` : ''}
                </p>
              ))}
            </div>
          );
        })}
      </details>
    </div>
  );
}
