import { Redirect, useLocation } from 'react-router-dom';
import Agent from '../carbonAgent';
import CompetitionEntry from '../components/CompetitionEntry';

export default function AgentEntry() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  if (query.get('section') === 'competition') {
    query.delete('section');
    return (
      <Redirect to={`/system/carbonCompetition/current?${query.toString()}`} />
    );
  }
  return (
    <>
      <Agent />
      <CompetitionEntry welcomeOnly />
    </>
  );
}
