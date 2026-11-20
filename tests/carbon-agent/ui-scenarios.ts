import type { Data } from '../../src/components/CarbonAgent/protocol';

export const messagePreview: Data[] = [
  {
    id: 'preview-question',
    messageId: 'preview-message',
    role: 'user',
    content: '请核算一瓶 500ml 矿泉水，优先使用上传的产品资料。',
    payload: {
      files: [
        {
          fileId: 'preview-file',
          name: '500ml矿泉水产品资料及包装材料清单_2026修订版.xlsx',
        },
      ],
    },
  },
  {
    id: 'preview-answer',
    messageId: 'preview-message',
    role: 'assistant',
    content:
      '### 产品资料核对\n已读取产品资料，以下是本次核算采用的边界：\n\n- 功能单位：1 瓶 500ml 矿泉水\n- 生命周期：原材料获取、生产制造、分销和储存\n\n> 部分包装数据尚待确认，可在模型详情中继续完善。\n\n| 排放源 | 活动数据 | 因子来源及说明 | 碳排放量 |\n| --- | --- | --- | --- |\n| 聚酯瓶体 | 0.012 kg | 包装材料生产，使用所选背景数据库 | 0.025 kgCO₂e |\n| 道路运输 | 180 km | 柴油货车运输，含省内仓储配送 | 0.008 kgCO₂e |\n\n计算关系：`碳排放量 = 活动数据 × 排放因子`。\n\n```text\nmaterial_emissions = material_mass * emission_factor\n```',
    payload: {
      cards: [
        {
          cardType: 'product_carbon_model',
          title:
            '500ml瓶装矿泉水（再生PET瓶身与可回收纸质外包装）半生命周期碳足迹模型',
          description:
            '已完成建模。您可以进入模型详情核对排放源、完善活动数据，并接续当前会话。',
          accountId: 'fixture-model',
          productId: 'fixture-product',
          status: 'COMPLETED',
        },
      ],
    },
  },
];

export const reviewPreview: Data[] = [
  {
    id: 'preview-review',
    messageId: 'preview-review-message',
    role: 'assistant',
    content: '建模方案已准备好，请核对下方数据后确认执行。',
    payload: {
      cards: [
        {
          cardType: 'action_request',
          title: '一瓶500ml矿泉水 · 建模方案',
          actionRequests: [
            {
              name: 'agent_modeling_execute_structured',
              args: {
                productName: '500ml瓶装矿泉水（再生PET包装）',
                accountName: '2026年度半生命周期核算',
                amount: 1,
                unitName: '瓶',
                emissionSources: [
                  {
                    clientSourceId: 'source-preview',
                    name: '再生PET瓶体与瓶盖包装材料',
                    amount: 0.012,
                    unitName: 'kg',
                    factor: {
                      name: '再生聚对苯二甲酸乙二醇酯颗粒生产',
                      factor: 2.1,
                      unit: 'kgCO₂e/kg',
                      reason: '按产品资料中的材质和生产地区匹配。',
                    },
                    transport: [
                      { name: '道路运输', distance: 180, distUnitName: 'km' },
                    ],
                  },
                ],
              },
            },
          ],
          resumeRequest: {
            approve: { action: 'resume', resumeData: { decision: 'approve' } },
            reject: { action: 'resume', resumeData: { decision: 'reject' } },
          },
        },
      ],
    },
  },
];
