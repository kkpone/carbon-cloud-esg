import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Sidebar from '../../../carbonAgent/components/Sidebar';
import AgentGuideModal, {
  AGENT_GUIDE_STEP_COUNT,
} from '../../../carbonAgent/components/AgentGuideModal';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../../../carbonAgent/constants';
import { WorkspaceProvider } from '../../../carbonAgent/team/workspace';
import styles from './index.module.less';

export default function CompetitionSidebar({
  authenticated,
  onLogin,
}: {
  authenticated: boolean;
  onLogin: () => void;
}) {
  const history = useHistory();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true',
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const navigate = (query: Record<string, string> = {}) =>
    history.push(`/system/carbonAgent?${new URLSearchParams(query)}`);
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <WorkspaceProvider>
        <Sidebar
          activeSection='competition'
          authenticated={authenticated}
          collapsed={collapsed}
          selectedSessionId=''
          onHistorySelect={conversation =>
            navigate({
              sessionId: conversation.sessionId || conversation.id,
              ...(conversation.projectSession && conversation.projectId
                ? { projectId: conversation.projectId }
                : {}),
            })
          }
          onLoginRequest={onLogin}
          onNewChat={() => navigate()}
          onOpenGuide={() => {
            setGuideStep(0);
            setGuideOpen(true);
          }}
          onRequireLogin={() => {
            if (authenticated) return true;
            onLogin();
            return false;
          }}
          onSelectSection={section =>
            navigate({
              section:
                section === 'productFootprint'
                  ? 'footprintAccounting'
                  : section,
            })
          }
          onToggleCollapsed={() =>
            setCollapsed(value => {
              localStorage.setItem(
                SIDEBAR_COLLAPSED_STORAGE_KEY,
                String(!value),
              );
              return !value;
            })
          }
          onViewAllHistory={() => navigate({ section: 'history' })}
        />
      </WorkspaceProvider>
      <AgentGuideModal
        open={guideOpen}
        stepIndex={guideStep}
        onClose={() => setGuideOpen(false)}
        onPrev={() => setGuideStep(step => Math.max(0, step - 1))}
        onNext={() =>
          guideStep === AGENT_GUIDE_STEP_COUNT - 1
            ? setGuideOpen(false)
            : setGuideStep(step => step + 1)
        }
        onStepChange={setGuideStep}
      />
    </aside>
  );
}
