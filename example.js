import { YouTubeTranscriptApi } from './dist/index.js';
import { TextFormatter, JSONFormatter } from './dist/formatters/index.js';

async function main() {
  try {
    // Create API instance
    const api = new YouTubeTranscriptApi();
    
    // Example video ID (you can change this to any YouTube video ID)
    const videoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
    
    console.log(`Fetching transcript for video: ${videoId}\n`);
    
    // Method 1: Direct fetch (default to English)
    console.log('Method 1: Direct fetch');
    const transcript = await api.fetch(videoId);
    console.log(`Found ${transcript.length} transcript snippets`);
    console.log('First 3 snippets:');
    transcript.snippets.slice(0, 3).forEach(snippet => {
      console.log(`  [${snippet.start}s - ${snippet.start + snippet.duration}s]: ${snippet.text}`);
    });
    
    // Method 2: List all available transcripts
    console.log('\n\nMethod 2: List available transcripts');
    const transcriptList = await api.list(videoId);
    console.log('Available transcripts:');
    for (const t of transcriptList) {
      console.log(`  - ${t.language} (${t.languageCode})${t.isGenerated ? ' [Generated]' : ' [Manual]'}`);
    }
    
    // Method 3: Format transcript as text
    console.log('\n\nMethod 3: Text formatted output (first 200 chars)');
    const textFormatter = new TextFormatter();
    const textOutput = textFormatter.formatTranscript(transcript);
    console.log(textOutput.substring(0, 200) + '...');
    
    // Method 4: Format as JSON
    console.log('\n\nMethod 4: JSON formatted (first snippet)');
    const jsonFormatter = new JSONFormatter();
    const jsonOutput = jsonFormatter.formatTranscript(transcript);
    const parsed = JSON.parse(jsonOutput);
    console.log(JSON.stringify(parsed[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.constructor.name);
    console.error('Message:', error.toString());
  }
}

main();