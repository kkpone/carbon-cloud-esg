import { saveAs } from 'file-saver';

import {
  GapClientStatus,
  GapDiagnosisItem,
  InterviewQuestionItem,
  InterviewStageGroup,
  PreResearchProject,
} from './types';

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const STATUS_LABEL_MAP: Record<GapClientStatus, string> = {
  compliant: '完全符合',
  partial: '部分符合',
  missing: '完全缺失',
  not_applicable: '不适用',
};

const STAGE_LABEL_MAP: Record<InterviewStageGroup, string> = {
  governance_policy: '一、治理与制度',
  actions_gap_closure: '二、本年重点举措与缺口补齐',
  quantitative_scope: '三、定量数据口径确认',
  cases_next_plan: '四、亮点案例挖掘与明年计划',
};

const buildExcelBlob = (sheetName: string, tableHtml: string) => {
  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8" /><style>',
    'table{border-collapse:collapse;font-family:PingFang SC,Microsoft YaHei,sans-serif;font-size:12px;}',
    'th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;mso-number-format:"@";}',
    'th{background:#e6f4f1;color:#04252b;font-weight:600;text-align:left;}',
    '.p0{background:#fff1f0;color:#cf1322;font-weight:600;}',
    '.p1{background:#fff7e6;color:#d46b08;font-weight:600;}',
    '.blind{background:#fff1f0;color:#cf1322;}',
    '</style><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>',
    `<x:Name>${escapeHtml(sheetName)}</x:Name>`,
    '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>',
    '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>',
    tableHtml,
    '</body></html>',
  ].join('');
  return new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
};

const buildWordBlob = (title: string, bodyHtml: string) => {
  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    `<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>`,
    'body{font-family:PingFang SC,Microsoft YaHei,sans-serif;color:#1f2937;line-height:1.7;font-size:13px;}',
    'h1{color:#04252b;font-size:20px;border-bottom:2px solid #026961;padding-bottom:6px;}',
    'h2{color:#026961;font-size:16px;margin-top:20px;}',
    'h3{color:#04252b;font-size:14px;margin-top:14px;}',
    'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px;}',
    'th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;text-align:left;}',
    'th{background:#f3f7f6;color:#04252b;font-weight:600;}',
    '.meta{background:#f5fbfa;border-left:3px solid #026961;padding:8px 12px;margin:10px 0;}',
    '</style></head><body>',
    bodyHtml,
    '</body></html>',
  ].join('');
  return new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
};

export const exportGapDiagnosisExcel = (
  project: PreResearchProject,
  items: GapDiagnosisItem[] = project.gapItems,
) => {
  const headers = [
    '诊断编号(gap_id)',
    'ESG维度',
    '所属议题',
    '来源标准/评级',
    '披露属性',
    '具体披露要求（原子项）',
    '客户上年披露现状',
    '上年报告证据摘录与页码',
    '具体差距诊断',
    '整改优先级',
    '本年补齐与整改建议',
    '建议对接责任部门',
  ];
  const rowsHtml = items
    .map(item => {
      const prioCls =
        item.priority === 'P0' ? 'p0' : item.priority === 'P1' ? 'p1' : '';
      return `<tr>
        <td>${escapeHtml(item.gap_id)}</td>
        <td>${escapeHtml(item.esg_pillar)}</td>
        <td>${escapeHtml(item.topic_name)}</td>
        <td>${escapeHtml(item.standard_source)}</td>
        <td>${escapeHtml(item.requirement_type)}</td>
        <td>${escapeHtml(item.requirement_detail)}</td>
        <td>${escapeHtml(STATUS_LABEL_MAP[item.client_status])}</td>
        <td>${escapeHtml(item.evidence_ref)}</td>
        <td>${escapeHtml(item.gap_description)}</td>
        <td class="${prioCls}">${escapeHtml(item.priority)}</td>
        <td>${escapeHtml(item.action_suggestion)}</td>
        <td>${escapeHtml(item.owner_dept)}</td>
      </tr>`;
    })
    .join('');
  const tableHtml = `<table><thead><tr>${headers
    .map(h => `<th>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  const blob = buildExcelBlob('合规与评级差距诊断表', tableHtml);
  saveAs(
    blob,
    `${project.companyName}_${project.period}_合规与评级差距诊断表.xls`,
  );
};

export const exportPeerBenchmarkExcel = (project: PreResearchProject) => {
  const headers = [
    '对标大类',
    '对标指标',
    `${project.companyName}（自身上年）`,
    ...project.peers.map(p => `${p.name}（${p.tag}）`),
    '是否同业盲区',
    'AI差异诊断与建议',
  ];
  const rowsHtml = project.benchmarkRows
    .map(row => {
      const peerCells = project.peers
        .map(p => `<td>${escapeHtml(row.peerValues[p.id] || '-')}</td>`)
        .join('');
      return `<tr>
        <td>${escapeHtml(row.dimensionGroup)}</td>
        <td>${escapeHtml(row.metricName)}</td>
        <td>${escapeHtml(row.selfValue)}</td>
        ${peerCells}
        <td class="${row.isPeerBlindSpot ? 'blind' : ''}">${
        row.isPeerBlindSpot ? '同业盲区-建议跟进' : '正常'
      }</td>
        <td>${escapeHtml(row.aiDiagnosis)}</td>
      </tr>`;
    })
    .join('');
  const tableHtml = `<table><thead><tr>${headers
    .map(h => `<th>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  const blob = buildExcelBlob('同业标杆对标矩阵', tableHtml);
  saveAs(blob, `${project.companyName}_${project.period}_同业标杆对标矩阵.xls`);
};

export const exportPeerBenchmarkWord = (project: PreResearchProject) => {
  const blindSpots = project.benchmarkRows.filter(r => r.isPeerBlindSpot);
  const adoptedCases = project.highlightCases.filter(c => c.adoptedForReport);
  const bodyHtml = [
    `<h1>${escapeHtml(project.companyName)} ${escapeHtml(
      project.period,
    )}年度 同业标杆对标分析摘要</h1>`,
    `<div class="meta">对标样本：${escapeHtml(
      project.peers.map(p => `${p.name}（${p.tag}）`).join('、'),
    )}<br/>共识别同业盲区 ${blindSpots.length} 项，采纳亮点专题 ${
      adoptedCases.length
    } 项。</div>`,
    '<h2>一、核心同业盲区（3家及以上竞对已披露而公司缺失）</h2>',
    '<table><thead><tr><th>对标指标</th><th>自身上年现状</th><th>AI差异诊断与建议</th></tr></thead><tbody>',
    blindSpots
      .map(
        r =>
          `<tr><td>${escapeHtml(r.metricName)}</td><td>${escapeHtml(
            r.selfValue,
          )}</td><td>${escapeHtml(r.aiDiagnosis)}</td></tr>`,
      )
      .join(''),
    '</tbody></table>',
    '<h2>二、亮点案例与年度专题借鉴池</h2>',
    '<table><thead><tr><th>标杆企业</th><th>维度</th><th>专题/案例名称</th><th>核心做法</th><th>是否采纳</th></tr></thead><tbody>',
    project.highlightCases
      .map(
        c =>
          `<tr><td>${escapeHtml(c.peerName)}</td><td>${escapeHtml(
            c.esgPillar,
          )}</td><td>${escapeHtml(c.title)}</td><td>${escapeHtml(
            c.summary,
          )}</td><td>${c.adoptedForReport ? '已采纳' : '备选'}</td></tr>`,
      )
      .join(''),
    '</tbody></table>',
  ].join('');
  const blob = buildWordBlob(
    `${project.companyName}_同业标杆对标分析摘要`,
    bodyHtml,
  );
  saveAs(
    blob,
    `${project.companyName}_${project.period}_同业标杆对标分析摘要.docx`,
  );
};

const renderDepartmentInterviewHtml = (
  deptName: string,
  questions: InterviewQuestionItem[],
) => {
  const stageOrder: InterviewStageGroup[] = [
    'governance_policy',
    'actions_gap_closure',
    'quantitative_scope',
    'cases_next_plan',
  ];
  const p0Count = questions.filter(q => q.priority_level === 'P0').length;
  const estMinutes = Math.min(60, Math.max(35, questions.length * 5));
  const sections = stageOrder
    .map(stage => {
      const list = questions.filter(q => q.stage_group === stage);
      if (!list.length) return '';
      const rows = list
        .map(
          q => `<tr>
            <td><strong>${escapeHtml(q.question_id)}</strong><br/>[${escapeHtml(
            q.priority_level,
          )}] ${escapeHtml(q.esg_topic)}</td>
            <td>${escapeHtml(q.question_origin)}</td>
            <td><strong>${escapeHtml(q.main_question)}</strong></td>
            <td>${q.follow_up_prompts
              .map((p, i) => `${i + 1}. ${escapeHtml(p)}`)
              .join('<br/>')}</td>
            <td>${q.expected_materials
              .map((m, i) => `${i + 1}. ${escapeHtml(m)}`)
              .join('<br/>')}</td>
          </tr>`,
        )
        .join('');
      return `<h3>${STAGE_LABEL_MAP[stage]}</h3><table><thead><tr><th style="width:14%">编号与优先级</th><th style="width:18%">提问依据（内部备注）</th><th style="width:24%">定制化主问题</th><th style="width:24%">现场追问方向</th><th style="width:20%">预期索要底稿资料</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join('');
  return `<h2>受访部门：${escapeHtml(deptName)}</h2><div class="meta">共 ${
    questions.length
  } 题（其中 P0 必问 ${p0Count} 题），建议访谈时长约 ${estMinutes} 分钟。</div>${sections}`;
};

export const exportInterviewOutlineWord = (
  project: PreResearchProject,
  deptName?: string,
) => {
  const targetDepts = deptName
    ? [deptName]
    : Array.from(new Set(project.interviewQuestions.map(q => q.target_dept)));
  const bodyParts = [
    `<h1>${escapeHtml(project.companyName)} ${escapeHtml(
      project.period,
    )}年度 ESG 定制化访谈提纲${
      deptName ? ` - ${escapeHtml(deptName)}` : '（全部分部门汇总）'
    }</h1>`,
    ...targetDepts.map(dept =>
      renderDepartmentInterviewHtml(
        dept,
        project.interviewQuestions.filter(q => q.target_dept === dept),
      ),
    ),
  ];
  const fileSuffix = deptName ? `${deptName}_访谈提纲` : '全部分部门访谈提纲包';
  const blob = buildWordBlob(
    `${project.companyName}_${fileSuffix}`,
    bodyParts.join(''),
  );
  saveAs(blob, `${project.companyName}_${project.period}_${fileSuffix}.docx`);
};
