import { CopyOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Input, Modal, Select, Switch } from 'antd';
import { FC, useEffect, useMemo, useState } from 'react';

import { Toast } from '@/utils';
import { copyToClipboard } from '@/utils/clipboard';

import styles from './index.module.less';
import { buildReportSystemPrompt } from '../../promptUtils';
import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  ReportPromptLanguage,
  ReportPromptLength,
  ReportPromptTone,
} from '../../service';

export interface IPromptConfigModalProps {
  open: boolean;
  value: ReportPromptConfig;
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  onCancel: () => void;
  onConfirm: (config: ReportPromptConfig) => void;
}

export const PromptConfigModal: FC<IPromptConfigModalProps> = ({
  open,
  value,
  reportInfo,
  sections,
  onCancel,
  onConfirm,
}) => {
  const [draft, setDraft] = useState<ReportPromptConfig>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const previewText = useMemo(
    () =>
      buildReportSystemPrompt({
        reportInfo,
        sections,
        config: draft,
      }),
    [reportInfo, sections, draft],
  );

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(previewText);
    if (ok) {
      Toast('success', I18N.esg.copyPromptSuccess);
    }
  };

  return (
    <Modal
      title={I18N.esg.reportPromptTitle}
      width={800}
      open={open}
      destroyOnClose
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.body}>
        <div className={styles.row}>
          <div className={styles.field}>
            <div className={styles.label}>{I18N.esg.promptTone}</div>
            <Select<ReportPromptTone>
              value={draft.tone}
              onChange={tone => setDraft(prev => ({ ...prev, tone }))}
              options={[
                {
                  label: I18N.esg.promptToneFormal,
                  value: 'formal_disclosure',
                },
                {
                  label: I18N.esg.promptToneExecutive,
                  value: 'concise_executive',
                },
                {
                  label: I18N.esg.promptToneInvestor,
                  value: 'investor_oriented',
                },
              ]}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.label}>{I18N.esg.promptLanguage}</div>
            <Select<ReportPromptLanguage>
              value={draft.language}
              onChange={language => setDraft(prev => ({ ...prev, language }))}
              options={[
                { label: I18N.esg.promptLangZhCn, value: 'zh-CN' },
                { label: I18N.esg.promptLangZhTw, value: 'zh-TW' },
                { label: I18N.esg.promptLangEnUs, value: 'en-US' },
              ]}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.label}>{I18N.esg.promptLength}</div>
            <Select<ReportPromptLength>
              value={draft.lengthLevel}
              onChange={lengthLevel =>
                setDraft(prev => ({ ...prev, lengthLevel }))
              }
              options={[
                { label: I18N.esg.promptLengthStandard, value: 'standard' },
                { label: I18N.esg.promptLengthDetailed, value: 'detailed' },
              ]}
            />
          </div>
        </div>

        <div className={styles.rowTwo}>
          <div className={styles.field}>
            <div className={styles.label}>{I18N.esg.companyShortNameLabel}</div>
            <Input
              value={draft.companyShortName}
              placeholder={I18N.esg.companyShortNamePlaceholder}
              maxLength={40}
              onChange={e =>
                setDraft(prev => ({
                  ...prev,
                  companyShortName: e.target.value,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <div className={styles.label}>
              {I18N.esg.preferredCarbonUnitLabel}
            </div>
            <Select<string>
              value={
                draft.preferredCarbonUnit === 'tCO2e' ? 'tCO2e' : 'tco2e_cn'
              }
              onChange={preferredCarbonUnit =>
                setDraft(prev => ({ ...prev, preferredCarbonUnit }))
              }
              options={[
                {
                  label: I18N.esg.preferredCarbonUnitOptionCn,
                  value: 'tco2e_cn',
                },
                {
                  label: I18N.esg.preferredCarbonUnitOptionEn,
                  value: 'tCO2e',
                },
              ]}
            />
          </div>
        </div>

        <div className={styles.groupTitle}>
          {I18N.esg.styleGuideSectionTitle}
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>
              {I18N.esg.enableStyleGuide}
            </div>
            <div className={styles.switchDesc}>
              {I18N.esg.enableStyleGuideDesc}
            </div>
          </div>
          <Switch
            checked={draft.enableStyleGuide}
            onChange={enableStyleGuide =>
              setDraft(prev => ({ ...prev, enableStyleGuide }))
            }
          />
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>
              {I18N.esg.enableFiveStepTemplate}
            </div>
            <div className={styles.switchDesc}>
              {I18N.esg.enableFiveStepTemplateDesc}
            </div>
          </div>
          <Switch
            checked={draft.enableFiveStepTemplate}
            onChange={enableFiveStepTemplate =>
              setDraft(prev => ({ ...prev, enableFiveStepTemplate }))
            }
          />
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>
              {I18N.esg.enableFourPillarTemplate}
            </div>
            <div className={styles.switchDesc}>
              {I18N.esg.enableFourPillarTemplateDesc}
            </div>
          </div>
          <Switch
            checked={draft.enableFourPillarTemplate}
            onChange={enableFourPillarTemplate =>
              setDraft(prev => ({ ...prev, enableFourPillarTemplate }))
            }
          />
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>
              {I18N.esg.enableStarCaseTemplate}
            </div>
            <div className={styles.switchDesc}>
              {I18N.esg.enableStarCaseTemplateDesc}
            </div>
          </div>
          <Switch
            checked={draft.enableStarCaseTemplate}
            onChange={enableStarCaseTemplate =>
              setDraft(prev => ({ ...prev, enableStarCaseTemplate }))
            }
          />
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>{I18N.esg.strictDataMode}</div>
            <div className={styles.switchDesc}>
              {I18N.esg.strictDataModeDesc}
            </div>
          </div>
          <Switch
            checked={draft.strictDataMode}
            onChange={strictDataMode =>
              setDraft(prev => ({ ...prev, strictDataMode }))
            }
          />
        </div>

        <div className={styles.switchCard}>
          <div className={styles.switchText}>
            <div className={styles.switchTitle}>
              {I18N.esg.highlightStandards}
            </div>
            <div className={styles.switchDesc}>
              {I18N.esg.highlightStandardsDesc}
            </div>
          </div>
          <Switch
            checked={draft.highlightStandards}
            onChange={highlightStandards =>
              setDraft(prev => ({ ...prev, highlightStandards }))
            }
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>{I18N.esg.globalPromptInstruction}</div>
          <Input.TextArea
            value={draft.customInstruction}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                customInstruction: e.target.value,
              }))
            }
            placeholder={I18N.esg.globalPromptPlaceholder}
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={1500}
            showCount
          />
        </div>

        <div className={styles.field}>
          <div className={styles.previewHeader}>
            <div className={styles.label}>{I18N.esg.promptPreviewTitle}</div>
            <Button
              type='link'
              size='small'
              icon={<CopyOutlined />}
              onClick={handleCopyPrompt}
            >
              {I18N.esg.copyPromptBtn}
            </Button>
          </div>
          <div className={styles.previewBox}>{previewText}</div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button onClick={onCancel}>{I18N.carbonFootprint.cancel}</Button>
        <Button
          type='primary'
          onClick={() => {
            onConfirm({
              ...draft,
              systemPrompt: previewText,
            });
            onCancel();
          }}
        >
          {I18N.esg.applyAndSavePrompt}
        </Button>
      </div>
    </Modal>
  );
};
