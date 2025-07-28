import { describe, test, expect } from '@jest/globals';
import { 
  Formatter,
  JSONFormatter, 
  TextFormatter, 
  PrettyPrintFormatter,
  WebVTTFormatter 
} from '../src/formatters/index.js';
import { FetchedTranscript, FetchedTranscriptSnippet } from '../src/transcript.js';

describe('Formatters', () => {
  const mockSnippets = [
    new FetchedTranscriptSnippet('Hello world', 0.0, 1.5),
    new FetchedTranscriptSnippet('This is a test', 1.5, 2.0)
  ];
  
  const mockTranscript = new FetchedTranscript(
    mockSnippets,
    'test123',
    'English',
    'en',
    false
  );

  test('base Formatter should throw on formatTranscript', () => {
    const formatter = new Formatter();
    expect(() => formatter.formatTranscript(mockTranscript)).toThrow();
  });

  test('JSONFormatter should format transcript as JSON', () => {
    const formatter = new JSONFormatter();
    const result = formatter.formatTranscript(mockTranscript);
    const parsed = JSON.parse(result);
    
    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe('Hello world');
    expect(parsed[0].start).toBe(0.0);
    expect(parsed[0].duration).toBe(1.5);
  });

  test('TextFormatter should format as plain text', () => {
    const formatter = new TextFormatter();
    const result = formatter.formatTranscript(mockTranscript);
    
    expect(result).toBe('Hello world\nThis is a test');
  });

  test('PrettyPrintFormatter should format with indentation', () => {
    const formatter = new PrettyPrintFormatter();
    const result = formatter.formatTranscript(mockTranscript);
    
    expect(result).toContain('  ');
    expect(result).toContain('Hello world');
  });

  test('WebVTTFormatter should format as WebVTT', () => {
    const formatter = new WebVTTFormatter();
    const result = formatter.formatTranscript(mockTranscript);
    
    expect(result).toContain('WEBVTT');
    expect(result).toContain('00:00:00.000 --> 00:00:01.500');
    expect(result).toContain('Hello world');
  });
});