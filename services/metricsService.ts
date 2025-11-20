
import { IskraMetrics, IskraPhase } from '../types';
import { metricsConfig } from '../config/metricsConfig';
import { clamp } from '../utils/metrics';

class MetricsService {
  /**
   * Analyzes user input text and returns target metric values.
   * This represents the "feeling" Iskra gets from the user's words.
   * It returns a partial object with only the metrics that were affected.
   * If no signals are found, it returns an empty object.
   * @param text The user's input string.
   * @returns A partial object of target IskraMetrics.
   */
  public calculateMetricsUpdate(text: string): Partial<IskraMetrics> {
    const lowerText = text.toLowerCase();
    const targets: Partial<IskraMetrics> = {};

    for (const key in metricsConfig) {
      const metricKey = key as keyof typeof metricsConfig;
      const config = metricsConfig[metricKey];
      let score = config.base; 
      let metricSpecificSignalFound = false;

      for (const signal of config.signals) {
        for (const keyword of signal.keywords) {
          const regex = new RegExp(keyword, 'g');
          const matches = lowerText.match(regex);
          if (matches) {
            score += signal.impact * matches.length;
            metricSpecificSignalFound = true;
          }
        }
      }
      
      if (metricSpecificSignalFound) {
        targets[metricKey] = clamp(score, 0, 1);
      }
    }
    
    return targets;
  }

  /**
   * Determines the IskraPhase based on the current metrics.
   * This logic is derived from the canon documentation.
   * @param metrics The current IskraMetrics.
   * @returns The calculated IskraPhase.
   */
  public getPhaseFromMetrics(metrics: IskraMetrics): IskraPhase {
    if (metrics.pain > 0.7 || (metrics.chaos > 0.6 && metrics.clarity < 0.4)) {
      return 'DARKNESS';
    }
    if (metrics.chaos > 0.7) {
        return 'TRANSITION';
    }
    if (metrics.drift > 0.6) {
        return 'ECHO';
    }
    if (metrics.trust < 0.5) {
        return 'SILENCE';
    }
    if (metrics.clarity > 0.8 && metrics.trust > 0.8 && metrics.pain < 0.2) {
      return 'CLARITY';
    }
    // Default phases for intermediate states
    if (metrics.chaos > 0.5) return 'TRANSITION';
    if (metrics.drift > 0.4) return 'ECHO';
    
    return 'CLARITY'; // Default peaceful state
  }
}

export const metricsService = new MetricsService();
