export interface PlayscapeFork {
  id: string;
  storyId: string;
  name: string;
  source: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SetSourceEvent {
  storyId: string;
  forkId: string;
  source: string;
}

export interface StoryReadyEvent {
  storyId: string;
  componentName: string;
  source: string;
}

export interface RenderStatusEvent {
  storyId: string;
  forkId: string;
  status: 'ok' | 'error';
  message?: string;
}
