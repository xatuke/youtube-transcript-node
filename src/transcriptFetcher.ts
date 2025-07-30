import { decode } from 'html-entities';
import { AxiosInstance, AxiosError } from 'axios';
import { 
  WATCH_URL, 
  INNERTUBE_API_URL, 
  INNERTUBE_CONTEXT 
} from './utils/constants.js';
import {
  TranscriptsDisabled,
  YouTubeDataUnparsable,
  YouTubeRequestFailed,
  InvalidVideoId,
  VideoUnavailable,
  VideoUnplayable,
  IpBlocked,
  RequestBlocked,
  AgeRestricted,
  FailedToCreateConsentCookie
} from './errors/index.js';
import { Transcript, TranscriptList } from './transcript.js';
import { 
  ProxyConfig, 
  CaptionsJson, 
  PlayabilityStatusData, 
  InnertubeData,
  TranslationLanguage 
} from './types.js';

const PlayabilityStatus = {
  OK: 'OK',
  ERROR: 'ERROR',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED'
} as const;

const PlayabilityFailedReason = {
  BOT_DETECTED: 'Sign in to confirm you\'re not a bot',
  AGE_RESTRICTED: 'This video may be inappropriate for some users.',
  VIDEO_UNAVAILABLE: 'This video is unavailable'
} as const;

export class TranscriptListFetcher {
  private _httpClient: AxiosInstance;
  private _proxyConfig: ProxyConfig | null;

  constructor(httpClient: AxiosInstance, proxyConfig: ProxyConfig | null = null) {
    this._httpClient = httpClient;
    this._proxyConfig = proxyConfig;
  }

  async fetch(videoId: string): Promise<TranscriptList> {
    const captionsJson = await this._fetchCaptionsJson(videoId);
    return TranscriptList.build(this._httpClient, videoId, captionsJson);
  }

  private async _fetchCaptionsJson(videoId: string, tryNumber = 0): Promise<CaptionsJson> {
    try {
      const html = await this._fetchVideoHtml(videoId);
      const apiKey = this._extractInnertubeApiKey(html, videoId);
      const innertubeData = await this._fetchInnertubeData(videoId, apiKey);
      return this._extractCaptionsJson(innertubeData, videoId);
    } catch (error) {
      if (error instanceof RequestBlocked && this._proxyConfig) {
        const retries = this._proxyConfig.retriesWhenBlocked || 0;
        if (tryNumber + 1 < retries) {
          return this._fetchCaptionsJson(videoId, tryNumber + 1);
        }
      }
      throw error;
    }
  }

  private _extractInnertubeApiKey(html: string, videoId: string): string {
    const pattern = /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/;
    const match = html.match(pattern);
    
    if (match && match[1]) {
      return match[1];
    }
    
    if (html.includes('class="g-recaptcha"')) {
      throw new IpBlocked(videoId);
    }
    
    throw new YouTubeDataUnparsable(videoId);
  }

  private _extractCaptionsJson(innertubeData: InnertubeData, videoId: string): CaptionsJson {
    this._assertPlayability(innertubeData.playabilityStatus, videoId);
    
    const captionsJson = innertubeData.captions?.playerCaptionsTracklistRenderer;
    
    if (!captionsJson || !captionsJson.captionTracks) {
      throw new TranscriptsDisabled(videoId);
    }
    
    return captionsJson;
  }

  private _assertPlayability(playabilityStatusData: PlayabilityStatusData | undefined, videoId: string): void {
    if (!playabilityStatusData) return;
    
    const playabilityStatus = playabilityStatusData.status;
    
    if (playabilityStatus === PlayabilityStatus.OK || !playabilityStatus) {
      return;
    }
    
    const reason = playabilityStatusData.reason || '';
    
    if (playabilityStatus === PlayabilityStatus.LOGIN_REQUIRED) {
      if (reason === PlayabilityFailedReason.BOT_DETECTED) {
        throw new RequestBlocked(videoId);
      }
      if (reason === PlayabilityFailedReason.AGE_RESTRICTED) {
        throw new AgeRestricted(videoId);
      }
    }
    
    if (playabilityStatus === PlayabilityStatus.ERROR && 
        reason === PlayabilityFailedReason.VIDEO_UNAVAILABLE) {
      if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
        throw new InvalidVideoId(videoId);
      }
      throw new VideoUnavailable(videoId);
    }
    
    const subReasons = playabilityStatusData.errorScreen
      ?.playerErrorMessageRenderer
      ?.subreason
      ?.runs
      ?.map(run => run.text || '') || [];
    
    throw new VideoUnplayable(videoId, reason, subReasons);
  }

  private async _createConsentCookie(html: string, videoId: string): Promise<void> {
    const match = html.match(/name="v" value="(.*?)"/);
    if (!match) {
      throw new FailedToCreateConsentCookie(videoId);
    }
    
    // Set cookie using the http client's cookie jar
    this._httpClient.defaults.headers.Cookie = `CONSENT=YES+${match[1]}`;
  }

  private async _fetchVideoHtml(videoId: string): Promise<string> {
    let html = await this._fetchHtml(videoId);
    
    if (html.includes('action="https://consent.youtube.com/s"')) {
      await this._createConsentCookie(html, videoId);
      html = await this._fetchHtml(videoId);
      
      if (html.includes('action="https://consent.youtube.com/s"')) {
        throw new FailedToCreateConsentCookie(videoId);
      }
    }
    
    return html;
  }

  private async _fetchHtml(videoId: string): Promise<string> {
    try {
      const response = await this._httpClient.get(
        WATCH_URL.replace('{video_id}', videoId)
      );
      return decode(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        throw new IpBlocked(videoId);
      }
      throw new YouTubeRequestFailed(videoId, error as Error);
    }
  }

  private async _fetchInnertubeData(videoId: string, apiKey: string): Promise<InnertubeData> {
    try {
      const response = await this._httpClient.post(
        INNERTUBE_API_URL.replace('{api_key}', apiKey),
        {
          context: INNERTUBE_CONTEXT,
          videoId: videoId
        }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        throw new IpBlocked(videoId);
      }
      throw new YouTubeRequestFailed(videoId, error as Error);
    }
  }
}

// Static build method for TranscriptList
TranscriptList.build = function(
  httpClient: AxiosInstance, 
  videoId: string, 
  captionsJson: CaptionsJson
): TranscriptList {
  const translationLanguages: TranslationLanguage[] = (captionsJson.translationLanguages || []).map(lang => ({
    language: lang.languageName.runs[0].text,
    languageCode: lang.languageCode
  }));
  
  const manuallyCreatedTranscripts: Record<string, Transcript> = {};
  const generatedTranscripts: Record<string, Transcript> = {};
  
  for (const caption of captionsJson.captionTracks) {
    const transcriptDict = caption.kind === 'asr' ? generatedTranscripts : manuallyCreatedTranscripts;
    
    transcriptDict[caption.languageCode] = new Transcript(
      httpClient,
      videoId,
      caption.baseUrl.replace('&fmt=srv3', ''),
      caption.name.runs[0].text,
      caption.languageCode,
      caption.kind === 'asr',
      caption.isTranslatable ? translationLanguages : []
    );
  }
  
  return new TranscriptList(
    videoId,
    manuallyCreatedTranscripts,
    generatedTranscripts,
    translationLanguages
  );
};