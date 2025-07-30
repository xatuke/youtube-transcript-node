export interface ProxyConfig {
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  retriesWhenBlocked?: number;
  preventKeepingConnectionsAlive?: boolean;
}

export interface TranslationLanguage {
  language: string;
  languageCode: string;
}

export interface TranscriptSnippetData {
  text: string;
  start: number;
  duration: number;
}

export interface CaptionTrack {
  baseUrl: string;
  name: {
    runs: Array<{ text: string }>;
  };
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

export interface CaptionsJson {
  captionTracks: CaptionTrack[];
  translationLanguages?: Array<{
    languageCode: string;
    languageName: {
      runs: Array<{ text: string }>;
    };
  }>;
}

export interface PlayabilityStatusData {
  status?: string;
  reason?: string;
  errorScreen?: {
    playerErrorMessageRenderer?: {
      subreason?: {
        runs?: Array<{ text?: string }>;
      };
    };
  };
}

export interface InnertubeData {
  playabilityStatus?: PlayabilityStatusData;
  captions?: {
    playerCaptionsTracklistRenderer?: CaptionsJson;
  };
}