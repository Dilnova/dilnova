interface Window {
  webkitAudioContext?: typeof AudioContext;
  turnstile?: {
    render: (container: string | HTMLElement, options: any) => string;
    remove: (widgetId: string) => void;
    reset: () => void;
  };
  google?: {
    translate?: {
      TranslateElement: any;
    };
  };
  googleTranslateElementInit?: () => void;
}
