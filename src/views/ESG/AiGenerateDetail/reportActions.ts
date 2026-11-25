import { Converter } from 'opencc-js';

import {
  ReportTranslateLang,
  postTranslateReport,
  translateTextBySurvey,
} from './service';
import { isEsgMockModeEnabled, isMockReportId } from '../mockReportService';

let cnToTwConverter: ((text: string) => string) | null = null;
let twToCnConverter: ((text: string) => string) | null = null;

const getCnToTw = () => {
  if (!cnToTwConverter) {
    cnToTwConverter = Converter({ from: 'cn', to: 'twp' });
  }
  return cnToTwConverter;
};

const getTwToCn = () => {
  if (!twToCnConverter) {
    twToCnConverter = Converter({ from: 'twp', to: 'cn' });
  }
  return twToCnConverter;
};

const ESG_EN_GLOSSARY: Array<[RegExp, string]> = [
  [
    /环境、社会及管治（ESG）报告/g,
    'Environmental, Social and Governance (ESG) Report',
  ],
  [/关于本报告/g, 'About This Report'],
  [/报告范围与编制依据/g, 'Reporting Scope and Preparation Basis'],
  [/数据说明与联系渠道/g, 'Data Notes and Contact Channels'],
  [/ESG治理与战略管理/g, 'ESG Governance and Strategic Management'],
  [/管治架构与合规风控/g, 'Governance Structure and Compliance Risk Control'],
  [/实质性议题识别与回应/g, 'Materiality Assessment and Response'],
  [
    /环境管理与低碳行动（E）/g,
    'Environmental Management and Low-Carbon Actions (E)',
  ],
  [
    /应对气候变化与碳排放管理/g,
    'Climate Change Response and Carbon Emissions Management',
  ],
  [/资源利用与污染防治/g, 'Resource Utilization and Pollution Prevention'],
  [
    /社会责任与价值共创（S）/g,
    'Social Responsibility and Shared Value Creation (S)',
  ],
  [/以人为本与员工发展/g, 'People-Oriented Culture and Employee Development'],
  [/供应链责任与客户权益/g, 'Responsible Supply Chain and Customer Rights'],
  [/附录与指标索引/g, 'Appendix and Disclosure Index'],
  [/关键关联指标绩效/g, 'Key Linked KPI Performance'],
  [
    /本节自定义上传依据文件与资料/g,
    'Section-Specific Uploaded Evidence and Materials',
  ],
  [
    /继承上级章节依据文件与资料/g,
    'Inherited Parent Chapter Evidence and Materials',
  ],
  [/生成策略追踪摘要/g, 'Generation Strategy Audit Summary'],
  [/指标名称/g, 'Indicator Name'],
  [/披露数值/g, 'Disclosed Value'],
  [/编码与对标标准/g, 'Code and Aligned Standards'],
  [/标准条款索引/g, 'Standard Clause Index'],
  [/章节专项写作要求/g, 'Section-Specific Writing Instructions'],
  [/全局提示词执行约束/g, 'Global Prompt Constraints'],
  [/吨二氧化碳当量/g, 'tCO2e'],
  [/温室气体排放/g, 'GHG emissions'],
  [/范围一/g, 'Scope 1'],
  [/范围二/g, 'Scope 2'],
  [/范围三/g, 'Scope 3'],
  [/双重重要性/g, 'double materiality'],
  [/利益相关方/g, 'stakeholders'],
  [/可持续发展/g, 'sustainable development'],
  [/碳排放/g, 'carbon emissions'],
  [/董事会ESG委员会/g, 'Board ESG Committee'],
  [/治理（Governance）/g, 'Governance'],
  [/战略（Strategy）/g, 'Strategy'],
  [
    /影响、风险和机遇管理（Risk Management）/g,
    'Impact, Risk and Opportunity Management',
  ],
  [/指标与目标（Metrics & Targets）/g, 'Metrics and Targets'],
  [/背景与痛点（Situation）/g, 'Situation'],
  [/改造目标（Target）/g, 'Target'],
  [/核心动作（Action）/g, 'Action'],
  [/量化结果（Result）/g, 'Result'],
  [/【专栏案例】/g, '[Spotlight Case] '],
  [/数据校验提示/g, 'Data Verification Notice'],
  [/制度文件/g, 'Policy Document'],
  [/数据台账/g, 'Data Ledger'],
  [/资质证书/g, 'Certificate'],
  [/案例素材/g, 'Case Material'],
  [/补充材料/g, 'Supplementary Material'],
  [/依据文件/g, 'Evidence File'],
  [/参考链接/g, 'Reference Link'],
  [/待补充/g, 'TBD'],
  [/报告期内/g, 'During the reporting period'],
];

const fallbackEnglishDraft = (markdown: string): string => {
  let output = markdown;
  ESG_EN_GLOSSARY.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, replacement);
  });
  return output;
};

const splitMarkdownForSurveyTranslate = (markdown: string): string[] => {
  const paragraphs = markdown.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';
  paragraphs.forEach(part => {
    if (`${current}\n\n${part}`.length > 800 && current) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? `${current}\n\n${part}` : part;
    }
  });
  if (current) {
    chunks.push(current);
  }
  return chunks;
};

const hasChineseChars = (text: string) => /[\u4e00-\u9fff]/.test(text);

export const translateReportMarkdown = async (params: {
  reportId: number;
  content: string;
  targetLang: ReportTranslateLang;
  cachedVersions?: Partial<Record<ReportTranslateLang, string>>;
}): Promise<{ content: string; usedLocalFallback: boolean }> => {
  const { reportId, content, targetLang, cachedVersions } = params;
  if (!content.trim()) {
    return { content, usedLocalFallback: false };
  }

  const baseZh = cachedVersions?.['zh-CN'];

  if (targetLang === 'zh-CN') {
    if (baseZh && !hasChineseChars(content)) {
      return { content: baseZh, usedLocalFallback: false };
    }
    if (hasChineseChars(content)) {
      return { content: getTwToCn()(content), usedLocalFallback: false };
    }
  }

  if (targetLang === 'zh-TW') {
    const sourceZh = hasChineseChars(content) ? content : baseZh;
    if (sourceZh && hasChineseChars(sourceZh)) {
      return { content: getCnToTw()(sourceZh), usedLocalFallback: false };
    }
  }

  const preferMock = isEsgMockModeEnabled() || isMockReportId(reportId);

  if (!preferMock) {
    try {
      const res = await postTranslateReport(
        {
          id: reportId,
          reportContent: content,
          targetLang,
        },
        { silentResponseError: true },
      );
      const payload = res?.data?.data;
      const translated =
        typeof payload === 'string'
          ? payload
          : payload?.reportContent || payload?.content;
      if (translated && translated.trim()) {
        return { content: translated, usedLocalFallback: false };
      }
    } catch {
      // fallback to survey translation endpoint or local converter
    }

    try {
      const fromLang = targetLang === 'zh-CN' ? 'en' : 'zh';
      const toLang = targetLang === 'en-US' ? 'en' : 'zh';
      const chunks = splitMarkdownForSurveyTranslate(content);
      const responses = await Promise.all(
        chunks.map(chunk =>
          translateTextBySurvey(
            { fromLang, toLang, text: chunk },
            { silentResponseError: true },
          ),
        ),
      );
      const translatedChunks = responses.map(resp => {
        const seg = resp?.data?.data;
        if (!seg) {
          throw new Error('empty survey translate response');
        }
        return targetLang === 'zh-TW' ? getCnToTw()(seg) : seg;
      });
      return {
        content: translatedChunks.join('\n\n'),
        usedLocalFallback: false,
      };
    } catch {
      // fallback to local translation
    }
  }

  if (targetLang === 'en-US') {
    const source = hasChineseChars(content) ? getTwToCn()(content) : content;
    return {
      content: fallbackEnglishDraft(source),
      usedLocalFallback: true,
    };
  }

  if (targetLang === 'zh-TW') {
    return {
      content: getCnToTw()(content),
      usedLocalFallback: true,
    };
  }

  return {
    content: getTwToCn()(content),
    usedLocalFallback: true,
  };
};

const escapeHtml = (raw: string) =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildPrintableReportHtml = (title: string, bodyHtml: string) => {
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #1f2937;
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      line-height: 1.75;
    }
    h1 { font-size: 22px; color: #04252b; margin: 0 0 16px; border-bottom: 2px solid #026961; padding-bottom: 8px; page-break-after: avoid; }
    h2 { font-size: 17px; color: #026961; margin: 22px 0 10px; page-break-after: avoid; }
    h3 { font-size: 14px; color: #04252b; margin: 16px 0 8px; page-break-after: avoid; }
    h4 { font-size: 13px; color: #111827; margin: 12px 0 6px; page-break-after: avoid; }
    p { margin: 8px 0; text-align: justify; }
    ul, ol { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    blockquote {
      margin: 10px 0;
      padding: 8px 12px;
      border-left: 3px solid #026961;
      background: #f5fbfa;
      color: #374151;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f3f7f6; color: #04252b; font-weight: 600; }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      background: #f8fafc;
    }
    pre { padding: 10px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; }
    img { max-width: 100%; height: auto; page-break-inside: avoid; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
};

export const buildWordBlobFromHtml = (title: string, bodyHtml: string) => {
  const safeTitle = escapeHtml(title);
  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8"><title>',
    safeTitle,
    '</title><style>body{font-family:PingFang SC,Microsoft YaHei,sans-serif;line-height:1.7;color:#1f2937;}h1{color:#04252b;}h2{color:#026961;}table{width:100%;border-collapse:collapse;margin:10px 0;}th,td{border:1px solid #d1d5db;padding:6px 8px;}th{background:#f3f7f6;}blockquote{border-left:3px solid #026961;padding:6px 10px;background:#f5fbfa;}</style></head><body>',
    bodyHtml,
    '</body></html>',
  ].join('');
  return new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
};

export const exportHtmlToPdfViaPrint = (title: string, bodyHtml: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(buildPrintableReportHtml(title, bodyHtml));
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  iframe.contentWindow.onafterprint = cleanup;
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 60000);
    }
  }, 250);
  return true;
};
