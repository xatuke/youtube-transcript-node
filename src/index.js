import axios from 'axios';
import axiosRetry from 'axios-retry';
import { TranscriptListFetcher } from './transcriptFetcher.js';
import { NoTranscriptFound } from './errors/index.js';

export * from './errors/index.js';
export { FetchedTranscript, FetchedTranscriptSnippet, Transcript, TranscriptList } from './transcript.js';

export class YouTubeTranscriptApi {
  constructor(proxyConfig = null, httpClient = null) {
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
      
      if (proxyConfig.retriesWhenBlocked > 0) {
        axiosRetry(this._httpClient, {
          retries: proxyConfig.retriesWhenBlocked,
          retryCondition: (error) => error.response?.status === 429
        });
      }
    }
    
    this._fetcher = new TranscriptListFetcher(this._httpClient, proxyConfig);
  }

  async fetch(videoId, languages = ['en'], preserveFormatting = false) {
    const transcriptList = await this.list(videoId);
    const transcript = transcriptList.findTranscript(languages);
    return transcript.fetch(preserveFormatting);
  }

  async list(videoId) {
    return this._fetcher.fetch(videoId);
  }
}