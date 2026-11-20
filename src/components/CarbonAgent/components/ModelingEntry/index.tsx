import { useContext, useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import agentIcon from '@/assets/images/carbonAgent/icons/agent-logo.svg';
import I18N, { serviceLangMap } from '@/lang/I18N';
import { LocaleContext } from '@/components/LocaleProvider';
import { useCarbonAgent } from '../../context';
import { api, openTeamManagement, reasonText } from '../../api';
import { list, text } from '../../protocol';
import Composer from '../Composer';
import type { ComposerValue } from '../Composer';
// 暂停 Agent 建模记录入口，保留组件实现。
// import Records from '../Records';
import styles from './index.module.less';

export default function ModelingEntry({
  productId,
  onStarted,
  compact = false,
}: {
  productId?: string;
  onStarted?: () => void;
  compact?: boolean;
}) {
  const agent = useCarbonAgent();
  const identity = useSelector(
    (state: RootState) => state.companyUserInfo?.access_token,
  );
  const { locale } = useContext(LocaleContext);
  const [value, setValue] = useState<ComposerValue>({
    message: '',
    files: [],
    scope: 1,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // const [records, setRecords] = useState(false);
  useEffect(() => {
    setValue({ message: '', files: [], scope: 1 });
    setError('');
    // setRecords(false);
  }, [identity]);
  useEffect(() => {
    agent.refreshAccess().catch(cause => setError(cause.message));
    const abort = new AbortController();
    const fallbackSuggestions = [
      I18N.productCarbonFootprintAI.quickSuggestions.suggestion1,
      I18N.productCarbonFootprintAI.quickSuggestions.suggestion2,
      I18N.productCarbonFootprintAI.quickSuggestions.suggestion3,
    ];
    api<unknown>(
      `/footprint3/chat/getAiDatalist?scene=pcfLite&lang=${serviceLangMap[locale]}`,
      undefined,
      abort.signal,
    )
      .then(result => {
        const next = list(result)
          .map(item =>
            text(locale === 'en-US' ? item.questionEn : item.question),
          )
          .filter(Boolean)
          .slice(0, 3);
        if (!abort.signal.aborted)
          setSuggestions(next.length ? next : fallbackSuggestions);
      })
      .catch(() => {
        if (!abort.signal.aborted) setSuggestions(fallbackSuggestions);
      });
    return () => abort.abort();
  }, [locale]);
  const submit = async () => {
    if (busy || !agent.access?.canUseAi) return;
    setBusy(true);
    setError('');
    try {
      await agent.startModeling({
        productId,
        message: value.message,
        files: value.files,
        modelingOptions: {
          scope: value.scope ?? 1,
          factorScope: value.factorScope,
        },
      });
      setValue({
        message: '',
        files: [],
        scope: value.scope,
        factorScope: value.factorScope,
      });
      onStarted?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : I18N.carbonAgent.modelingFailed,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={compact ? styles.compact : styles.entry}>
      <div className={styles.logo}>
        <img src={agentIcon} alt='' />
      </div>
      <h2>
        {I18N.productCarbonFootprintAI.title} <span>Carbon Agent</span>
      </h2>
      <p>{I18N.productCarbonFootprintAI.description}</p>
      <div className={styles.suggestions}>
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            type='button'
            disabled={busy}
            title={suggestion}
            onClick={() =>
              setValue(previous => ({ ...previous, message: suggestion }))
            }
          >
            <span>{suggestion}</span>
          </button>
        ))}
      </div>
      <div className={styles.input}>
        <Composer
          value={value}
          onChange={next => setValue(previous => ({ ...previous, ...next }))}
          modeling
          disabled={!agent.access?.canUseAi}
          busy={busy}
          onSubmit={() => submit()}
        />
      </div>
      {error && <Alert showIcon type='error' message={error} />}
      {agent.access && !agent.access.canUseAi && (
        <Alert
          showIcon
          type='info'
          message={reasonText(
            agent.access.aiReasonCode || agent.access.reasonCode,
          )}
        />
      )}
      <div className={styles.links}>
        {/* <Button type='link' onClick={() => setRecords(true)}>
          {I18N.carbonAgent.recordsTitle}
        </Button> */}
        {agent.access?.canManage && (
          <Button
            type='link'
            onClick={() =>
              openTeamManagement(locale).catch(cause => setError(cause.message))
            }
          >
            {I18N.carbonAgent.teamManagementEntry}
          </Button>
        )}
      </div>
      {/* {records && <Records onClose={() => setRecords(false)} />} */}
    </section>
  );
}
