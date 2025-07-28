export class Formatter {
  formatTranscript(transcript, kwargs = {}) {
    throw new Error('A subclass of Formatter must implement their own .formatTranscript() method.');
  }

  formatTranscripts(transcripts, kwargs = {}) {
    throw new Error('A subclass of Formatter must implement their own .formatTranscripts() method.');
  }
}

export class PrettyPrintFormatter extends Formatter {
  formatTranscript(transcript, kwargs = {}) {
    return JSON.stringify(transcript.toRawData(), null, 2);
  }

  formatTranscripts(transcripts, kwargs = {}) {
    return JSON.stringify(transcripts.map(t => t.toRawData()), null, 2);
  }
}

export class JSONFormatter extends Formatter {
  formatTranscript(transcript, kwargs = {}) {
    return JSON.stringify(transcript.toRawData(), null, kwargs.indent);
  }

  formatTranscripts(transcripts, kwargs = {}) {
    return JSON.stringify(transcripts.map(t => t.toRawData()), null, kwargs.indent);
  }
}

export class TextFormatter extends Formatter {
  formatTranscript(transcript, kwargs = {}) {
    return transcript.snippets.map(snippet => snippet.text).join('\n');
  }

  formatTranscripts(transcripts, kwargs = {}) {
    return transcripts.map(t => this.formatTranscript(t, kwargs)).join('\n\n\n');
  }
}

export class WebVTTFormatter extends Formatter {
  formatTranscript(transcript, kwargs = {}) {
    const lines = ['WEBVTT\n'];
    
    for (const snippet of transcript.snippets) {
      const start = this._secondsToTime(snippet.start);
      const end = this._secondsToTime(snippet.start + snippet.duration);
      lines.push(`${start} --> ${end}`);
      lines.push(snippet.text);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  formatTranscripts(transcripts, kwargs = {}) {
    return transcripts.map(t => this.formatTranscript(t, kwargs)).join('\n\n');
  }

  _secondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.round((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  }
}