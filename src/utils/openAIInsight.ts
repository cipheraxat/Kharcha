import { useStore, AIInsightRequest } from '../store';
import { generateInsightExplanation } from '../services/insightService';

/**
 * Opens the global AI Insight Panel for a tapped insight card and kicks off
 * the AI explanation request. The panel is rendered once at the App root.
 */
export function openAIInsight(request: AIInsightRequest) {
  const store = useStore.getState();
  store.setAIInsightOpen({ request, isLoading: true });

  const reqId = request.insightType + ':' + request.title;

  generateInsightExplanation({
    insightType: request.insightType,
    title: request.title,
    context: request.context,
  })
    .then((explanation) => {
      // Only apply if the user hasn't closed/replaced the panel in the meantime
      const current = useStore.getState().request;
      if (current && current.insightType + ':' + current.title === reqId) {
        useStore.getState().setAIInsightExplanation(explanation);
      }
    })
    .catch((err) => {
      console.warn('[openAIInsight] explanation failed:', err);
      const current = useStore.getState().request;
      if (current && current.insightType + ':' + current.title === reqId) {
        useStore.getState().setAIInsightExplanation(null);
      }
    });
}
