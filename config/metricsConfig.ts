
import { IskraMetrics } from '../types';

/**
 * Defines the configuration for calculating Iskra's dynamic metrics from text.
 * Based on the formal definitions provided in the technical plan.
 */

// A signal represents a set of keywords or patterns that influence a metric.
interface Signal {
  keywords: (string | RegExp)[];
  impact: number; // The amount to add to the metric score per occurrence.
}

// Configuration for a single metric.
interface MetricConfig {
  base: number; // The neutral "gravity" point for this metric.
  signals: Signal[];
}

// Type for the full configuration object, ensuring all metrics are covered.
// mirror_sync is derived, so we omit it from text-based calculation config.
type MetricsConfiguration = Record<keyof Omit<IskraMetrics, 'rhythm' | 'interrupt' | 'ctxSwitch' | 'mirror_sync'>, MetricConfig>;

export const metricsConfig: MetricsConfiguration = {
  trust: {
    base: 0.8,
    signals: [
      // Positive signals: agreement, gratitude, affiliation
      { keywords: ['спасибо', 'согласен', 'понял', 'хорошо', 'доверяю', 'верим', 'мы', '🤗', '⟡'], impact: 0.15 },
      // Negative signals: uncertainty, doubt
      { keywords: ['не уверен', 'сомневаюсь', 'наверно', 'может быть', 'не думаю', 'трудно сказать'], impact: -0.2 },
    ],
  },
  clarity: {
    base: 0.7,
    signals: [
      // Positive signals: structure, precision, keywords
      { keywords: [/\d\./, /\d\)/, 'шаг', 'пункт', 'конкретно', 'точно', 'ясно', '☉'], impact: 0.2 },
      // Negative signals: confusion, questions
      { keywords: ['не понимаю', 'запутался', 'сложно', 'неясно', /\?\?\?/, 'в смысле'], impact: -0.3 },
    ],
  },
  pain: {
    base: 0.1,
    signals: [
      // Strong pain signals from lexicon
      { keywords: ['∆', '⚑', 'больно', 'тяжело', 'страшно', 'не могу', 'рухнуло', 'устал', 'стресс', 'проблема'], impact: 0.4 },
    ],
  },
  drift: {
    base: 0.1,
    signals: [
      // Drift signals indicating topic change or distraction
      { keywords: ['кстати', 'другой вопрос', 'не по теме', 'возвращаясь', 'ушли от темы', 'противоречит', '🪞'], impact: 0.35 },
    ],
  },
  chaos: {
    base: 0.2,
    signals: [
      // Chaos signals indicating conflicting intentions or disorganization
      { keywords: ['🜃', 'хаос', 'все смешалось', 'бардак', 'не знаю с чего начать'], impact: 0.4 },
      // Keywords indicating frequent topic switching or indecision
      { keywords: ['или', 'а может', 'хотя нет', 'с другой стороны'], impact: 0.15 },
    ],
  },
  echo: {
    base: 0.5,
    signals: [
      { keywords: ['повтори', 'снова', 'опять', 'эхо', '📡', 'резонирует'], impact: 0.2 },
      { keywords: ['мимо', 'не слышишь', 'не то'], impact: -0.2 },
    ]
  },
  silence_mass: {
    base: 0.1,
    signals: [
      { keywords: ['...', 'тишина', 'молчи', '≈', 'пауза'], impact: 0.3 },
      { keywords: ['говори', 'расскажи', 'ответь'], impact: -0.1 },
    ]
  }
};
