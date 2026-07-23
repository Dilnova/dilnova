interface Window {
  webkitAudioContext?: typeof AudioContext;
  turnstile?: {
    render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
    remove: (widgetId: string) => void;
    reset: () => void;
  };
  google?: {
    translate?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TranslateElement: any;
    };
  };
  googleTranslateElementInit?: () => void;
}
