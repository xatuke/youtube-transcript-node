import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { TranscriptListFetcher } from './transcriptFetcher.js';
import { ProxyConfig } from './types.js';
import { FetchedTranscript, TranscriptList } from './transcript.js';

export * from './errors/index.js';
export { FetchedTranscript, FetchedTranscriptSnippet, Transcript, TranscriptList } from './transcript.js';
export * from './types.js';

export class YouTubeTranscriptApi {
  private _httpClient: AxiosInstance;
  private _fetcher: TranscriptListFetcher;

  constructor(proxyConfig: ProxyConfig | null = null, httpClient: AxiosInstance | null = null) {
    this._httpClient = httpClient || axios.create({
      headers: {
        'Accept-Language': 'en-US'
      }
    });
    
    if (proxyConfig) {
      if (proxyConfig.proxy) {
        this._httpClient.defaults.proxy = proxyConfig.proxy;
      }
      
      if (proxyConfig.preventKeepingConnectionsAlive) {
        this._httpClient.defaults.headers['Connection'] = 'close';
      }
      
      if (proxyConfig.retriesWhenBlocked && proxyConfig.retriesWhenBlocked > 0) {
        axiosRetry(this._httpClient, {
          retries: proxyConfig.retriesWhenBlocked,
          retryCondition: (error) => error.response?.status === 429
        });
      }
    }
    
    this._fetcher = new TranscriptListFetcher(this._httpClient, proxyConfig);
  }

  async fetch(videoId: string, languages: string[] = ['en'], preserveFormatting = false): Promise<FetchedTranscript> {
    const transcriptList = await this.list(videoId);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch(preserveFormatting);
  }

  async list(videoId: string): Promise<TranscriptList> {
    return this._fetcher.fetch(videoId);
  }
}