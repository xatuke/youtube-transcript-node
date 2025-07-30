export class YouTubeTranscriptApiException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CouldNotRetrieveTranscript extends YouTubeTranscriptApiException {
  videoId: string;
  protected ERROR_MESSAGE: string;
  protected CAUSE_MESSAGE_INTRO: string;
  protected CAUSE_MESSAGE: string;
  protected GITHUB_REFERRAL: string;

  constructor(videoId: string) {
    super('');
    this.videoId = videoId;
    this.ERROR_MESSAGE = `\nCould not retrieve a transcript for the video https://www.youtube.com/watch?v=${videoId}!`;
    this.CAUSE_MESSAGE_INTRO = ' This is most likely caused by:\n\n';
    this.CAUSE_MESSAGE = '';
    this.GITHUB_REFERRAL = '\n\nIf you are sure that the described cause is not responsible for this error ' +
      'and that a transcript should be retrievable, please create an issue at ' +
      'https://github.com/jdepoix/youtube-transcript-api/issues. ' +
      'Please add which version of youtube_transcript_api you are using ' +
      'and provide the information needed to replicate the error. ' +
      'Also make sure that there are no open issues which already describe your problem!';
    this.message = this.toString();
  }

  get cause(): string {
    return this.CAUSE_MESSAGE;
  }

  toString(): string {
    let errorMessage = this.ERROR_MESSAGE;
    if (this.cause) {
      errorMessage += this.CAUSE_MESSAGE_INTRO + this.cause + this.GITHUB_REFERRAL;
    }
    return errorMessage;
  }
}

export class YouTubeDataUnparsable extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The data required to fetch the transcript is not parsable. This should ' +
      'not happen, please open an issue (make sure to include the video ID)!';
  }
}

export class YouTubeRequestFailed extends CouldNotRetrieveTranscript {
  reason: string;

  constructor(videoId: string, error: Error) {
    super(videoId);
    this.reason = error.message || String(error);
    this.CAUSE_MESSAGE = `Request to YouTube failed: ${this.reason}`;
  }
}

export class VideoUnavailable extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The video is unavailable';
  }
}

export class VideoUnplayable extends CouldNotRetrieveTranscript {
  reason: string;
  subReasons: string[];

  constructor(videoId: string, reason: string, subReasons: string[] = []) {
    super(videoId);
    this.reason = reason;
    this.subReasons = subReasons;
    this.CAUSE_MESSAGE = `The video is unplayable for the following reason: ${reason}`;
    if (subReasons.length > 0) {
      this.CAUSE_MESSAGE += `\n\nAdditional Details:\n${subReasons.join('\n')}`;
    }
  }
}

export class TranscriptsDisabled extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'Transcripts are disabled for this video';
  }
}

export class NoTranscriptFound extends CouldNotRetrieveTranscript {
  requestedLanguageCodes: string[];
  transcriptData: any;

  constructor(videoId: string, requestedLanguageCodes: string[], transcriptData: any) {
    super(videoId);
    this.requestedLanguageCodes = requestedLanguageCodes;
    this.transcriptData = transcriptData;
    this.CAUSE_MESSAGE = `No transcripts were found for any of the requested language codes: ${requestedLanguageCodes.join(', ')}\n\n` +
      `Available transcripts:\n${transcriptData}`;
  }
}

export class TranslationLanguageNotAvailable extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The requested translation language is not available';
  }
}

export class NotTranslatable extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The transcript is not translatable';
  }
}

export class FailedToCreateConsentCookie extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'Failed to automatically give consent to saving cookies';
  }
}

export class InvalidVideoId extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'You provided an invalid video id. Make sure you are using the video ' +
      'id and NOT the url!';
  }
}

export class IpBlocked extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'Your IP address is being blocked by YouTube. Please consider using a proxy.';
  }
}

export class RequestBlocked extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The request to YouTube was blocked.';
  }
}

export class AgeRestricted extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'The video is age restricted';
  }
}

export class PoTokenRequired extends CouldNotRetrieveTranscript {
  constructor(videoId: string) {
    super(videoId);
    this.CAUSE_MESSAGE = 'YouTube requires a proof of origin token for this request';
  }
}