import { parseStringPromise } from 'xml2js';
import { decode } from 'html-entities';
import { 
  PoTokenRequired, 
  NotTranslatable, 
  TranslationLanguageNotAvailable,
  NoTranscriptFound 
} from './errors/index.js';

export class FetchedTranscriptSnippet {
  constructor(text, start, duration) {
    this.text = text;
    this.start = start;
    this.duration = duration;
  }
}

export class FetchedTranscript {
  constructor(snippets, videoId, language, languageCode, isGenerated) {
    this.snippets = snippets;
    this.videoId = videoId;
    this.language = language;
    this.languageCode = languageCode;
    this.isGenerated = isGenerated;
  }

  [Symbol.iterator]() {
    return this.snippets[Symbol.iterator]();
  }

  get length() {
    return this.snippets.length;
  }

  toRawData() {
    return this.snippets.map(snippet => ({
      text: snippet.text,
      start: snippet.start,
      duration: snippet.duration
    }));
  }
}

export class Transcript {
  constructor(httpClient, videoId, url, language, languageCode, isGenerated, translationLanguages) {
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

  async fetch(preserveFormatting = false) {
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

  async _parseTranscript(xmlData, preserveFormatting) {
    const result = await parseStringPromise(xmlData);
    const textElements = result.transcript.text || [];
    
    return textElements.map(element => {
      const text = preserveFormatting ? element._ : decode(element._).replace(/\s+/g, ' ').trim();
      const start = parseFloat(element.$.start);
      const duration = parseFloat(element.$.dur || '0');
      
      return new FetchedTranscriptSnippet(text, start, duration);
    });
  }

  get isTranslatable() {
    return this.translationLanguages.length > 0;
  }

  translate(languageCode) {
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

  toString() {
    return `${this.languageCode} ("${this.language}")${this.isTranslatable ? '[TRANSLATABLE]' : ''}`;
  }
}

export class TranscriptList {
  constructor(videoId, manuallyCreatedTranscripts, generatedTranscripts, translationLanguages) {
    this.videoId = videoId;
    this._manuallyCreatedTranscripts = manuallyCreatedTranscripts;
    this._generatedTranscripts = generatedTranscripts;
    this._translationLanguages = translationLanguages;
  }

  [Symbol.iterator]() {
    const allTranscripts = [
      ...Object.values(this._manuallyCreatedTranscripts),
      ...Object.values(this._generatedTranscripts)
    ];
    return allTranscripts[Symbol.iterator]();
  }

  findTranscript(languageCodes) {
    return this._findTranscript(languageCodes, [this._manuallyCreatedTranscripts, this._generatedTranscripts]);
  }

  findGeneratedTranscript(languageCodes) {
    return this._findTranscript(languageCodes, [this._generatedTranscripts]);
  }

  findManuallyCreatedTranscript(languageCodes) {
    return this._findTranscript(languageCodes, [this._manuallyCreatedTranscripts]);
  }

  _findTranscript(languageCodes, sources) {
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

  toString() {
    const transcriptStrings = [];
    
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