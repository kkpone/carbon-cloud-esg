import {
  EnterpriseCarbonCanvasView,
  type CanvasTaskPanelSlotProps,
  type CanvasViewProps,
} from '@/components/EnterpriseCarbonCanvas';

import { enterpriseCarbonTaskService } from '../EnterpriseCarbonProjectTasks/service';
import EnterpriseCarbonCanvasTaskPanel from './EnterpriseCarbonCanvasTaskPanel';

type AgentCanvasViewProps = Omit<CanvasViewProps, 'renderTaskPanel'>;

const renderTaskPanel = (props: CanvasTaskPanelSlotProps) => (
  <EnterpriseCarbonCanvasTaskPanel
    {...props}
    service={enterpriseCarbonTaskService}
  />
);

const CanvasView = (props: AgentCanvasViewProps) => (
  <EnterpriseCarbonCanvasView {...props} renderTaskPanel={renderTaskPanel} />
);

export default CanvasView;
