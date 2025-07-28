# YouTube Transcript Node

This is a Node.js API which allows you to retrieve the transcript/subtitles for a given YouTube video. It also works for automatically generated subtitles, supports translating subtitles and it does not require a headless browser, like other selenium based solutions do!

## Install

```
npm install youtube-transcript-node
```

## API

The easiest way to get a transcript for a given video is to execute:

```javascript
import { YouTubeTranscriptApi } from 'youtube-transcript-node';

const api = new YouTubeTranscriptApi();
const transcript = await api.fetch(videoId);
```

> **Note:** By default, this will try to access the English transcript of the video. If your video has a different language, or you are interested in fetching a transcript in a different language, please read the section below.

> **Note:** Pass in the video ID, NOT the video URL. For a video with the URL `https://www.youtube.com/watch?v=12345` the ID is `12345`.

This will return a `FetchedTranscript` object with a `snippets` array containing objects like:

```javascript
{
  text: "Hey there",
  start: 0.0,
  duration: 1.54
}
```

### Use different languages

You can add a list of preferred languages, which will be used as a fallback if the first one is not available.

```javascript
const transcript = await api.fetch(videoId, ['de', 'en']);
```

### List available transcripts

To get a list of all available transcripts for a video:

```javascript
const transcriptList = await api.list(videoId);
```

### Get specific transcript types

```javascript
const transcriptList = await api.list(videoId);

// Get manually created transcripts
const transcript = transcriptList.findManuallyCreatedTranscript(['de', 'en']);

// Get automatically generated transcripts  
const transcript = transcriptList.findGeneratedTranscript(['de', 'en']);

// Get any transcript (manual first, then generated)
const transcript = transcriptList.findTranscript(['de', 'en']);
```

### Translate transcripts

```javascript
const transcriptList = await api.list(videoId);
const transcript = transcriptList.findTranscript(['en']);
const translatedTranscript = transcript.translate('de');
const fetchedTranslated = await translatedTranscript.fetch();
```

### Preserve formatting

By default, HTML tags are stripped from the transcript. To preserve formatting:

```javascript
const transcript = await api.fetch(videoId, ['en'], true);
```

## Formatters

You can use different formatters to format the transcript output:

```javascript
import { JSONFormatter, TextFormatter, WebVTTFormatter } from 'youtube-transcript-node/formatters';

const formatter = new TextFormatter();
const formattedText = formatter.formatTranscript(transcript);
```

Available formatters:
- `JSONFormatter` - Formats as JSON
- `TextFormatter` - Formats as plain text  
- `PrettyPrintFormatter` - Formats as pretty-printed JSON
- `WebVTTFormatter` - Formats as WebVTT subtitles

## Exception Handling

```javascript
import { 
  TranscriptsDisabled,
  NoTranscriptFound,
  VideoUnavailable,
  InvalidVideoId 
} from 'youtube-transcript-node';

try {
  const transcript = await api.fetch(videoId);
} catch (error) {
  if (error instanceof TranscriptsDisabled) {
    // Subtitles are disabled for this video
  } else if (error instanceof NoTranscriptFound) {
    // No transcript found in requested languages
  } else if (error instanceof VideoUnavailable) {
    // Video is unavailable
  } else if (error instanceof InvalidVideoId) {
    // Invalid video ID provided
  }
}
```

## License

MIT