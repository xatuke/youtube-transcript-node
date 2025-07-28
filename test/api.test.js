import { describe, test, expect, jest } from '@jest/globals';
import { YouTubeTranscriptApi } from '../src/index.js';
import * as errors from '../src/errors/index.js';

describe('YouTubeTranscriptApi', () => {
  test('should create instance with default settings', () => {
    const api = new YouTubeTranscriptApi();
    expect(api).toBeDefined();
    expect(api._fetcher).toBeDefined();
  });

  test('should create instance with proxy config', () => {
    const proxyConfig = {
      proxy: {
        host: 'localhost',
        port: 8080
      },
      retriesWhenBlocked: 3
    };
    
    const api = new YouTubeTranscriptApi(proxyConfig);
    expect(api).toBeDefined();
  });

  test('should have fetch method', () => {
    const api = new YouTubeTranscriptApi();
    expect(typeof api.fetch).toBe('function');
  });

  test('should have list method', () => {
    const api = new YouTubeTranscriptApi();
    expect(typeof api.list).toBe('function');
  });
});

describe('Errors', () => {
  test('should export all error classes', () => {
    expect(errors.YouTubeTranscriptApiException).toBeDefined();
    expect(errors.CouldNotRetrieveTranscript).toBeDefined();
    expect(errors.TranscriptsDisabled).toBeDefined();
    expect(errors.NoTranscriptFound).toBeDefined();
    expect(errors.VideoUnavailable).toBeDefined();
    expect(errors.InvalidVideoId).toBeDefined();
    expect(errors.IpBlocked).toBeDefined();
    expect(errors.RequestBlocked).toBeDefined();
    expect(errors.AgeRestricted).toBeDefined();
    expect(errors.PoTokenRequired).toBeDefined();
  });

  test('error should have proper message format', () => {
    const error = new errors.VideoUnavailable('test123');
    expect(error.videoId).toBe('test123');
    expect(error.toString()).toContain('test123');
  });
});