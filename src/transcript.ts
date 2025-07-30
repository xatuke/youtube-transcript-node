import { parseStringPromise } from 'xml2js';
import { decode } from 'html-entities';
import { AxiosInstance } from 'axios';
import { 
  PoTokenRequired, 
  NotTranslatable, 
  TranslationLanguageNotAvailable,
  NoTranscriptFound 
} from './errors/index.js';
import { TranslationLanguage, TranscriptSnippetData } from './types.js';

export class FetchedTranscriptSnippet {
  text: string;
  start: number;
  duration: number;

  constructor(text: string, start: number, duration: number) {
    this.text = text;
    this.start = start;
    this.duration = duration;
  }
}

export class FetchedTranscript {
  snippets: FetchedTranscriptSnippet[];
  videoId: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;

  constructor(
    snippets: FetchedTranscriptSnippet[], 
    videoId: string, 
    language: string, 
    languageCode: string, 
    isGenerated: boolean
  ) {
    this.snippets = snippets;
    this.videoId = videoId;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
  }

  [Symbol.iterator](): Iterator<FetchedTranscriptSnippet> {
    return this.snippets[Symbol.iterator]();
  }

  get length(): number {
    return this.snippets.length;
  }

  toRawData(): TranscriptSnippetData[] {
    return this.snippets.map(snippet => ({
      text: snippet.text,
      start: snippet.start,
      duration: snippet.duration
    }));
  }
}

export class Transcript {
  private _httpClient: AxiosInstance;
  videoId: string;
  private _url: string;
  language: string;
  languageCode: string;
  isGenerated: boolean;
  translationLanguages: TranslationLanguage[];
  private _translationLanguagesDict: Record<string, string>;

  constructor(
    httpClient: AxiosInstance, 
    videoId: string, 
    url: string, 
    language: string, 
    languageCode: string, 
    isGenerated: boolean, 
    translationLanguages: TranslationLanguage[]
  ) {
    this._httpClient = httpClient;
    this.videoId = videoId;
    this._url = url;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
    this.translationLanguages = translationLanguages;
    this._translationLanguagesDict = {};
    
    for (const translationLanguage of translationLanguages) {
      this._translationLanguagesDict[translationLanguage.languageCode] = translationLanguage.language;
    }
  }

  async fetch(preserveFormatting = false): Promise<FetchedTranscript> {
    if (this._url.includes('&exp=xpe')) {
      throw new PoTokenRequired(this.videoId);
    }

    const response = await this._httpClient.get(this._url);
    const snippets = await this._parseTranscript(response.data, preserveFormatting);
    
    return new FetchedTranscript(
      snippets,
      this.videoId,
      this.language,
      this.languageCode,
      this.isGenerated
    );
  }

  private async _parseTranscript(xmlData: string, preserveFormatting: boolean): Promise<FetchedTranscriptSnippet[]> {
    const result = await parseStringPromise(xmlData);
    const textElements = result.transcript?.text || [];
    
    return textElements.map((element: any) => {
      const text = preserveFormatting ? element._ : decode(element._).replace(/\s+/g, ' ').trim();
      const start = parseFloat(element.$.start);
      const duration = parseFloat(element.$.dur || '0');
      
      return new FetchedTranscriptSnippet(text, start, duration);
    });
  }

  get isTranslatable(): boolean {
    return this.translationLanguages.length > 0;
  }

  translate(languageCode: string): Transcript {
    if (!this.isTranslatable) {
      throw new NotTranslatable(this.videoId);
    }

    if (!(languageCode in this._translationLanguagesDict)) {
      throw new TranslationLanguageNotAvailable(this.videoId);
    }

    return new Transcript(
      this._httpClient,
      this.videoId,
      `${this._url}&tlang=${languageCode}`,
      this._translationLanguagesDict[languageCode],
      languageCode,
      true,
      []
    );
  }

  toString(): string {
    return `${this.languageCode} ("${this.language}")${this.isTranslatable ? '[TRANSLATABLE]' : ''}`;
  }
}

export class TranscriptList {
  videoId: string;
  private _manuallyCreatedTranscripts: Record<string, Transcript>;
  private _generatedTranscripts: Record<string, Transcript>;
  private _translationLanguages: TranslationLanguage[];

  static build: (httpClient: AxiosInstance, videoId: string, captionsJson: any) => TranscriptList;

  constructor(
    videoId: string, 
    manuallyCreatedTranscripts: Record<string, Transcript>, 
    generatedTranscripts: Record<string, Transcript>, 
    translationLanguages: TranslationLanguage[]
  ) {
    this.videoId = videoId;
    this._manuallyCreatedTranscripts = manuallyCreatedTranscripts;
    this._generatedTranscripts = generatedTranscripts;
    this._translationLanguages = translationLanguages;
  }

  [Symbol.iterator](): Iterator<Transcript> {
    const allTranscripts = [
      ...Object.values(this._manuallyCreatedTranscripts),
      ...Object.values(this._generatedTranscripts)
    ];
    return allTranscripts[Symbol.iterator]();
  }

  findTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [this._manuallyCreatedTranscripts, this._generatedTranscripts]);
  }

  findGeneratedTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [this._generatedTranscripts]);
  }

  findManuallyCreatedTranscript(languageCodes: string[]): Transcript {
    return this._findTranscript(languageCodes, [this._manuallyCreatedTranscripts]);
  }

  private _findTranscript(languageCodes: string[], sources: Record<string, Transcript>[]): Transcript {
    for (const languageCode of languageCodes) {
      for (const source of sources) {
        if (languageCode in source) {
          return source[languageCode];
        }
      }
    }

    throw new NoTranscriptFound(
      this.videoId,
      languageCodes,
      this
    );
  }

  toString(): string {
    const transcriptStrings: string[] = [];
    
    if (Object.keys(this._manuallyCreatedTranscripts).length > 0) {
      transcriptStrings.push(
        'Manually created:\n' + 
        Object.values(this._manuallyCreatedTranscripts).map(t => ` - ${t}`).join('\n')
      );
    }
    
    if (Object.keys(this._generatedTranscripts).length > 0) {
      transcriptStrings.push(
        'Generated:\n' + 
        Object.values(this._generatedTranscripts).map(t => ` - ${t}`).join('\n')
      );
    }
    
    if (this._translationLanguages.length > 0) {
      transcriptStrings.push(
        'Translation languages:\n' + 
        this._translationLanguages.map(t => ` - ${t.language} (${t.languageCode})`).join('\n')
      );
    }
    
    return transcriptStrings.join('\n\n');
  }
}