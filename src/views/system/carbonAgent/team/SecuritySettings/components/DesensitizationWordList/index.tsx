import { CloseOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import classNames from 'classnames';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { teamApi } from '../../../api';
import { errorText } from '../../../errors';
import { teamText } from '../../../i18n';
import {
  DESENSITIZATION_TOTAL_MAX_COUNT,
  DESENSITIZATION_WORD_MAX_LENGTH,
  DESENSITIZATION_WORD_MIN_LENGTH,
} from '../../../securityHelpers';
import type { DesensitizationWord } from '../../../types';
import { QueryState } from '../../../ui';
import { useWorkspace } from '../../../workspace';
import style from './index.module.less';

type DesensitizationWordListProps = {
  disabled: boolean;
};

const DesensitizationWordList = ({
  disabled,
}: DesensitizationWordListProps) => {
  const { key, refresh } = useWorkspace();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const wordsQuery = useQuery([...key, 'security-words'], () =>
    teamApi.desensitizationWords({
      pageNum: 1,
      pageSize: DESENSITIZATION_TOTAL_MAX_COUNT,
    }),
  );

  const words = wordsQuery.data?.rows || [];
  const totalCount = wordsQuery.data?.total ?? words.length;

  const invalidateWords = () => {
    queryClient.invalidateQueries({ queryKey: [...key, 'security-words'] });
    refresh();
  };

  const handleAddWord = async () => {
    if (disabled || saving) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (
      trimmed.length < DESENSITIZATION_WORD_MIN_LENGTH ||
      trimmed.length > DESENSITIZATION_WORD_MAX_LENGTH
    ) {
      message.warning(teamText('securityWordRequired'));
      return;
    }
    if (totalCount >= DESENSITIZATION_TOTAL_MAX_COUNT) {
      message.warning(teamText('securityWordLimitExceededError'));
      return;
    }
    if (
      words.some(
        item => item.word.trim().toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      message.warning(teamText('securityWordDuplicateError'));
      return;
    }
    setSaving(true);
    try {
      await teamApi.createDesensitizationWords([
        { word: trimmed, enabled: true },
      ]);
      setDraft('');
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    } finally {
      setSaving(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleDelete = async (row: DesensitizationWord) => {
    if (disabled || removingId) return;
    setRemovingId(row.id);
    try {
      await teamApi.deleteDesensitizationWord(row.id);
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    } finally {
      setRemovingId('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddWord();
      return;
    }
    if (event.key === 'Backspace' && !draft && words.length > 0) {
      event.preventDefault();
      handleDelete(words[words.length - 1]);
    }
  };

  return (
    <section
      className={classNames(style.card, { [style.cardDisabled]: disabled })}
    >
      <div className={style.header}>
        <div>
          <h3>{teamText('securityDesensitizationSectionTitle')}</h3>
          <p>{teamText('securityDesensitizationSectionDescription')}</p>
        </div>
        <span className={style.countBadge}>
          {teamText('securityWordCountSummary', {
            value0: totalCount,
            value1: DESENSITIZATION_TOTAL_MAX_COUNT,
          })}
        </span>
      </div>

      <QueryState query={wordsQuery}>
        <div
          className={classNames(style.editor, {
            [style.editorDisabled]: disabled,
          })}
          onClick={() => {
            if (!disabled) inputRef.current?.focus();
          }}
        >
          {words.map(item => (
            <span className={style.wordTag} key={item.id}>
              <span className={style.wordText} title={item.word}>
                {item.word}
              </span>
              <button
                type='button'
                className={style.removeButton}
                disabled={disabled || removingId === item.id}
                aria-label={teamText('securityDeleteWordConfirm', {
                  value0: item.word,
                })}
                onClick={event => {
                  event.stopPropagation();
                  handleDelete(item);
                }}
              >
                <CloseOutlined />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type='text'
            className={style.inlineInput}
            value={draft}
            disabled={disabled || saving}
            maxLength={DESENSITIZATION_WORD_MAX_LENGTH}
            placeholder={teamText('securityWordEnterPlaceholder')}
            aria-label={teamText('securityDesensitizationSectionTitle')}
            onChange={event => setDraft(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <p className={style.helperText}>
          {teamText('securityWordEnterHelper')}
        </p>
      </QueryState>
    </section>
  );
};

export default DesensitizationWordList;
