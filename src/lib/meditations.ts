export type Meditation = {
  id: string;
  title: string;
  durationSeconds: number;
  description?: string;
  audioUrl?: string;
};

export const MEDITATIONS: readonly Meditation[] = [
  {
    id: 'body-scan',
    title: 'Body Scan',
    durationSeconds: 600, // 10 minutes
    description: 'A gentle body awareness practice to notice sensations and release tension.',
    audioUrl: undefined,
  },
  {
    id: 'breathing-space',
    title: 'Breathing Space',
    durationSeconds: 180, // 3 minutes
    description: 'Short anchoring practice to reconnect with the breath and the present moment.',
    audioUrl: undefined,
  },
  {
    id: 'loving-kindness',
    title: 'Loving-Kindness',
    durationSeconds: 420, // 7 minutes
    description: 'Cultivate warmth and goodwill toward yourself and others.',
    audioUrl: undefined,
  },
  {
    id: 'sleep-ease',
    title: 'Sleep Ease',
    durationSeconds: 900, // 15 minutes
    description: 'A calming guided practice to help prepare the body and mind for sleep.',
    audioUrl: undefined,
  },
];
