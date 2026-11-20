/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import I18N, { serviceLangMap } from '@src/lang/I18N';
import { useMount } from 'ahooks';
import { Spin, Select, Input, Button, Drawer } from 'antd';
import classNames from 'classnames';
import { isNil } from 'lodash-es';
import { FC, useContext, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { FullscreenModal } from '@/components/FullscreenModal';
import { LocaleContext } from '@/components/LocaleProvider';
import { IconAlibabaNew } from '@/components/iconfont';
import { LocaleType } from '@/lang/I18N';
import { generateUUID, Toast } from '@/utils';

import styles from './index.module.less';
import { submitImportanceAnalysis } from './service';
import {
  IMPORTANCE,
  IMPORTANCE_LABEL,
} from '../ImportanceAnalysisInfo/constant';
import { getImportanceAnalysisInfo } from '../ImportanceAnalysisInfo/service';

const getTopicAnswerRefKey = (
  topicId: number | string,
  resultType: 'company' | 'self',
) => `${topicId}:${resultType}`;

const scrollToQuestionnaireField = (element?: HTMLElement | null) => {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
  Array.from(
    element.querySelectorAll<HTMLElement>(
      'button, [role="combobox"], input, textarea',
    ),
  )
    .find(control => control.offsetParent !== null)
    ?.focus({ preventScroll: true });
};

const ImportanceAnalysisFill: FC = () => {
  const { id } = useParams<{ id: string }>();

  const [analysisInfo, setAnalysisInfo] = useState<Record<string, any>>();

  const [answer, setAnswer] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);

  const { locale, changeLocale } = useContext(LocaleContext);

  const [submitted, setSubmitted] = useState(false);

  const [roleSelectorOpen, setRoleSelectorOpen] = useState(false);

  const timeRef = useRef(0);
  const roleFieldRef = useRef<HTMLDivElement>(null);
  const topicAnswerFieldRefs = useRef(new Map<string, HTMLDivElement>());

  const isZh = locale === LocaleType.zhCN;

  const selectedRole = analysisInfo?.roles?.find(
    role => role.id === answer.roleId,
  );

  const submit = async () => {
    try {
      setSubmitLoading(true);
      if (isNil(answer.roleId)) {
        Toast('error', I18N.esg.pleaseSelectYour);
        scrollToQuestionnaireField(roleFieldRef.current);
        return;
      }
      const firstIncompleteTopic = answer.topics?.find(
        topic => isNil(topic.companyResult) || isNil(topic.selfResult),
      );

      if (firstIncompleteTopic) {
        const resultType = isNil(firstIncompleteTopic.companyResult)
          ? 'company'
          : 'self';

        Toast('error', I18N.esg.pleaseChooseATopic);
        scrollToQuestionnaireField(
          topicAnswerFieldRefs.current.get(
            getTopicAnswerRefKey(firstIncompleteTopic.topicId, resultType),
          ),
        );
        return;
      }

      await submitImportanceAnalysis({
        ...answer,
        useTime: Number(((Date.now() - timeRef.current) / 1000).toFixed(0)),
        lang: serviceLangMap[locale],
      });
      setSubmitted(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  useMount(() => {
    timeRef.current = Date.now();

    if (id) {
      setLoading(true);
      getImportanceAnalysisInfo({ id: Number(id) })
        .then(async ({ data }) => {
          const questionnaireInfo = data.data;

          const userId = await generateUUID();
          setAnswer({
            surveyId: questionnaireInfo.id,
            userId,
            roleId: null,
            topics: questionnaireInfo.topics?.reduce(
              (prev, topicGroup) => [
                ...prev,
                ...(topicGroup.topicList || [])
                  .filter(topic => topic.related === 1)
                  .map(topic => ({
                    topicId: topic.topicId,
                    companyResult: null,
                    selfResult: null,
                  })),
              ],
              [],
            ),
            questions: questionnaireInfo.questions?.map(question => ({
              id: question.id,
              answer: null,
            })),
          });
          setAnalysisInfo(questionnaireInfo);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  });

  if (submitted) {
    return (
      <FullscreenModal>
        <div className={styles.importanceAnalysisFill}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>{I18N.esg.esgIsImportant2}</div>
          </div>
          <div className={styles.content}>
            <div className={styles.submittedContent}>
              <IconAlibabaNew
                className={styles.submittedIcon}
                type='icon-sucesse'
              />
              <div className={styles.submittedText}>
                {I18N.esg.theQuestionnaireHasBeenSubmitted}
              </div>
            </div>
          </div>
        </div>
      </FullscreenModal>
    );
  }

  return (
    <FullscreenModal>
      <div className={styles.importanceAnalysisFill}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>{I18N.esg.esgIsImportant2}</div>
          <button
            aria-label={isZh ? 'Switch to English' : '切换为中文'}
            className={styles.langBtn}
            type='button'
            onClick={() =>
              changeLocale({
                currentLocale:
                  locale === LocaleType.zhCN
                    ? LocaleType.enUS
                    : LocaleType.zhCN,
                onlyFeSwitch: true,
              })
            }
          >
            <IconAlibabaNew
              className={styles.langIcon}
              type={isZh ? 'icon-zhongwen' : 'icon-EN'}
            />
          </button>
        </div>
        <div className={styles.content}>
          <Spin spinning={loading}>
            {analysisInfo && (
              <div
                className={classNames(styles.questionnaire, {
                  [styles.enQuestionnaire]: !isZh,
                })}
              >
                <div className={styles.questionnaireHeader}>
                  <div className={styles.questionnaireTitle}>
                    {analysisInfo[isZh ? 'name' : 'nameEn']}
                  </div>
                  <div className={styles.questionnaireDescription}>
                    {analysisInfo[isZh ? 'introduction' : 'introductionEn']}
                  </div>
                </div>
                <div className={styles.questionnaireContent}>
                  <div className={styles.questionnaireItem}>
                    <div className={styles.questionnaireItemTitle}>
                      {I18N.carbonFootprint3.basicInformation}
                    </div>
                    <div className={styles.questionnaireRow} ref={roleFieldRef}>
                      <div>{I18N.esg.whatIsYourIdentity}</div>
                      <Select
                        className={styles.desktopRoleSelect}
                        placeholder={I18N.esg.pleaseSelectYour}
                        value={answer.roleId}
                        options={analysisInfo.roles?.map(role => ({
                          label: role[isZh ? 'role' : 'roleEn'],
                          value: role.id,
                        }))}
                        onChange={roleId => {
                          setAnswer({ ...answer, roleId });
                        }}
                      />
                      <button
                        aria-expanded={roleSelectorOpen}
                        aria-haspopup='dialog'
                        className={styles.mobileRoleSelect}
                        type='button'
                        onClick={() => setRoleSelectorOpen(true)}
                      >
                        <span
                          className={classNames(styles.mobileRoleSelectValue, {
                            [styles.mobileRoleSelectPlaceholder]: !selectedRole,
                          })}
                        >
                          {selectedRole
                            ? selectedRole[isZh ? 'role' : 'roleEn']
                            : I18N.esg.pleaseSelectYour}
                        </span>
                        <span className={styles.mobileRoleSelectArrow} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.questionnaireItem}>
                    <div className={styles.questionnaireItemTitle}>
                      {I18N.esg.importanceOfTheTopic}
                    </div>
                    <div className={styles.topicGroup}>
                      {analysisInfo.topics?.map(topicGroup => (
                        <div
                          className={classNames(styles.topicGroupItem, {
                            [styles.ETopicGroupItem]:
                              topicGroup.moduleType === '1',
                            [styles.STopicGroupItem]:
                              topicGroup.moduleType === '2',
                            [styles.GTopicGroupItem]:
                              topicGroup.moduleType === '3',
                          })}
                        >
                          <div className={styles.topicGroupName}>
                            {topicGroup[isZh ? 'moduleName' : 'moduleNameEn']}
                          </div>
                          {topicGroup.topicList
                            ?.filter(topic => topic.related === 1)
                            ?.map(topic => {
                              const topicName = topic[isZh ? 'name' : 'nameEn'];
                              const topicAnswer =
                                answer.topics?.find(
                                  t => t.topicId === topic.topicId,
                                ) || {};

                              return (
                                <div className={styles.topicItem}>
                                  <div className={styles.topicInfoItem}>
                                    <div className={styles.topicTitle}>
                                      {topicName}
                                    </div>
                                    <div>
                                      {topic[isZh ? 'analysis' : 'analysisEn']}
                                    </div>
                                  </div>
                                  <div
                                    className={styles.topicInfoItem}
                                    ref={element => {
                                      const key = getTopicAnswerRefKey(
                                        topic.topicId,
                                        'company',
                                      );

                                      if (element) {
                                        topicAnswerFieldRefs.current.set(
                                          key,
                                          element,
                                        );
                                      } else {
                                        topicAnswerFieldRefs.current.delete(
                                          key,
                                        );
                                      }
                                    }}
                                  >
                                    <div className={styles.topicTitle}>
                                      {I18N.esg.importantToTheCompany}
                                      {topicName}
                                      {I18N.esg.forTheCompanysBusiness}
                                    </div>
                                    <div className={styles.scoreContent}>
                                      <div className={styles.importanceTab}>
                                        {Object.values(IMPORTANCE).map(
                                          importance => (
                                            <button
                                              key={importance}
                                              type='button'
                                              className={classNames(
                                                styles.importanceTabItem,
                                                {
                                                  [styles.currentImportanceTabItem]:
                                                    topicAnswer.companyResult ===
                                                    importance,
                                                  [styles.enImportanceTabItem]:
                                                    !isZh,
                                                },
                                              )}
                                              onClick={() => {
                                                Object.assign(topicAnswer, {
                                                  companyResult: importance,
                                                });
                                                setAnswer({ ...answer });
                                              }}
                                            >
                                              {IMPORTANCE_LABEL(importance)}
                                            </button>
                                          ),
                                        )}
                                      </div>
                                      {!isNil(topicAnswer.companyResult) &&
                                        topicAnswer.companyResult >= 0 && (
                                          <div className={styles.score}>
                                            {topicAnswer.companyResult}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                  <div
                                    className={styles.topicInfoItem}
                                    ref={element => {
                                      const key = getTopicAnswerRefKey(
                                        topic.topicId,
                                        'self',
                                      );

                                      if (element) {
                                        topicAnswerFieldRefs.current.set(
                                          key,
                                          element,
                                        );
                                      } else {
                                        topicAnswerFieldRefs.current.delete(
                                          key,
                                        );
                                      }
                                    }}
                                  >
                                    <div className={styles.topicTitle}>
                                      {I18N.esg.regardingStakeholdersInterests}
                                      {topicName}
                                      {I18N.esg.forYou}
                                    </div>
                                    <div className={styles.scoreContent}>
                                      <div className={styles.importanceTab}>
                                        {Object.values(IMPORTANCE).map(
                                          importance => (
                                            <button
                                              key={importance}
                                              type='button'
                                              className={classNames(
                                                styles.importanceTabItem,
                                                {
                                                  [styles.currentImportanceTabItem]:
                                                    topicAnswer.selfResult ===
                                                    importance,
                                                  [styles.enImportanceTabItem]:
                                                    !isZh,
                                                },
                                              )}
                                              onClick={() => {
                                                Object.assign(topicAnswer, {
                                                  selfResult: importance,
                                                });
                                                setAnswer({ ...answer });
                                              }}
                                            >
                                              {IMPORTANCE_LABEL(importance)}
                                            </button>
                                          ),
                                        )}
                                      </div>
                                      {!isNil(topicAnswer.selfResult) &&
                                        topicAnswer.selfResult >= 0 && (
                                          <div className={styles.score}>
                                            {topicAnswer.selfResult}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.questionnaireItem}>
                    <div className={styles.questionnaireItemTitle}>
                      {I18N.esg.otherIssues}
                    </div>
                    <div className={styles.otherQuestionContent}>
                      {analysisInfo.questions?.map(question => {
                        const questionAnswer =
                          answer.questions?.find(q => q.id === question.id) ||
                          {};

                        return (
                          <div className={styles.questionnaireRow}>
                            <div>
                              {question[isZh ? 'question' : 'questionEn']}
                            </div>
                            <Input.TextArea
                              autoSize={{ minRows: 3, maxRows: 6 }}
                              value={questionAnswer.answer}
                              onChange={e => {
                                Object.assign(questionAnswer, {
                                  answer: e.target.value,
                                });
                                setAnswer({ ...answer });
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Spin>
        </div>
        <div className={styles.footer}>
          <Button
            className={styles.submitBtn}
            type='primary'
            loading={submitLoading}
            onClick={submit}
          >
            {I18N.questionnaire.submitQuestionnaire}
          </Button>
        </div>
      </div>
      <Drawer
        height='auto'
        open={roleSelectorOpen}
        placement='bottom'
        rootClassName={styles.mobileRoleDrawerRoot}
        title={I18N.esg.whatIsYourIdentity}
        zIndex={1100}
        onClose={() => setRoleSelectorOpen(false)}
      >
        <div className={styles.mobileRoleOptions}>
          {analysisInfo?.roles?.map(role => {
            const selected = role.id === answer.roleId;

            return (
              <button
                aria-pressed={selected}
                className={classNames(styles.mobileRoleOption, {
                  [styles.mobileRoleOptionSelected]: selected,
                })}
                key={role.id}
                type='button'
                onClick={() => {
                  setAnswer({ ...answer, roleId: role.id });
                  setRoleSelectorOpen(false);
                }}
              >
                <span>{role[isZh ? 'role' : 'roleEn']}</span>
                {selected && (
                  <span className={styles.mobileRoleOptionCheck}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </Drawer>
    </FullscreenModal>
  );
};

export default ImportanceAnalysisFill;
