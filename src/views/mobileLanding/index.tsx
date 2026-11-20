import agentArrow from '@src/assets/images/mobileLanding/agent-arrow.svg';
import agentEarth from '@src/assets/images/mobileLanding/agent-earth.png';
import carbonAgentLogo from '@src/assets/images/mobileLanding/carbon-agent-logo.svg';
import carbonCloudLogo from '@src/assets/images/mobileLanding/carbon-cloud-logo.png';
import featureAccounting from '@src/assets/images/mobileLanding/feature-accounting.svg';
import featureAi from '@src/assets/images/mobileLanding/feature-ai.svg';
import featureCertification from '@src/assets/images/mobileLanding/feature-certification.svg';
import featureData from '@src/assets/images/mobileLanding/feature-data.svg';
import heroContours from '@src/assets/images/mobileLanding/hero-contours.svg';
import platformPreview from '@src/assets/images/mobileLanding/platform-preview.png';

import styles from './index.module.less';

const FEATURES = [
  {
    title: 'AI 智能碳管理',
    description: '从政策问答、自动建模到减排建议，让复杂管理更简单。',
    icon: featureAi,
  },
  {
    title: '全场景碳核算',
    description: '覆盖企业、产品与供应链，统一沉淀和管理碳排放数据。',
    icon: featureAccounting,
  },
  {
    title: '数据驱动决策',
    description: '依托专业因子库与行业数据，对标排放表现、识别减排空间。',
    icon: featureData,
  },
  {
    title: '在线认证协同',
    description: '线上申请、反馈与材料协同，让认证流程更清晰、更高效。',
    icon: featureCertification,
  },
];

const MANAGEMENT_FLOW = [
  { index: '01', title: '算清', description: '是管理的起点' },
  { index: '02', title: '数据', description: '是决策的依据' },
  { index: '03', title: '减排', description: '聚焦关键行动' },
  { index: '04', title: '认证', description: '让成果值得信赖' },
];

const MobileLanding = () => (
  <main className={styles.page}>
    <header className={styles.header}>
      <img className={styles.headerLogo} src={carbonCloudLogo} alt='碳云' />
    </header>

    <section className={styles.hero}>
      <img
        className={styles.heroContours}
        src={heroContours}
        alt=''
        aria-hidden='true'
      />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <span>让每一克碳</span>
          <span>都有迹可循</span>
        </h1>
        <p className={styles.heroDescription}>
          以数字化和 AI
          能力，连接碳核算、碳管理、碳减排与碳披露，帮助企业构建可持续的碳管理体系。
        </p>
      </div>
    </section>

    <section className={styles.platformSection} aria-label='碳云平台预览'>
      <img
        className={styles.platformPreview}
        src={platformPreview}
        alt=''
        aria-hidden='true'
      />
      <span className={styles.screenReaderOnly}>
        请使用电脑浏览器访问，打开同一网址，体验碳云完整功能。
      </span>
    </section>

    <section className={styles.featureSection}>
      <div className={styles.sectionHeading}>
        <h2>把复杂的碳管理，变得简单</h2>
        <p>用一个平台，承接企业从数据到决策的碳管理全流程。</p>
      </div>
      <div className={styles.featureList}>
        {FEATURES.map(feature => (
          <article className={styles.featureCard} key={feature.title}>
            <img
              className={styles.featureIcon}
              src={feature.icon}
              alt=''
              aria-hidden='true'
            />
            <div className={styles.featureContent}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className={styles.flowSection}>
      <div className={styles.sectionHeading}>
        <h2>从核算，到管理</h2>
        <p>四步完成碳管理闭环，让减碳路径清晰可见。</p>
      </div>
      <ol className={styles.flowList}>
        {MANAGEMENT_FLOW.map(item => (
          <li className={styles.flowItem} key={item.index}>
            <span className={styles.flowIndex}>{item.index}</span>
            <div className={styles.flowContent}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section className={styles.agentSection}>
      <div className={styles.agentHeading}>
        <h2>想在手机上体验？</h2>
        <p>Carbon Agent 已支持移动端，随时获取 AI 碳管理建议。</p>
      </div>
      <a
        className={styles.agentCard}
        href='https://agent.carbonstop.com'
        target='_blank'
        rel='noreferrer'
      >
        <div className={styles.agentContent}>
          <div className={styles.agentTitle}>
            <span>体验</span>
            <img src={carbonAgentLogo} alt='Carbon Agent' />
          </div>
          <p>政策问答、碳核算指导与减排建议</p>
        </div>
        <img className={styles.agentArrow} src={agentArrow} alt='' />
      </a>
      <img
        className={styles.agentEarth}
        src={agentEarth}
        alt=''
        aria-hidden='true'
      />
    </section>

    <footer className={styles.footer}>
      <img src={carbonCloudLogo} alt='碳云' />
      <p>CARBONSTOP · 数字化碳管理</p>
    </footer>
  </main>
);

export default MobileLanding;
