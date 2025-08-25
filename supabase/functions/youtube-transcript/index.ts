
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

// Function to fetch YouTube captions using yt-dlp API approach
async function fetchYouTubeCaptions(videoId: string): Promise<string> {
  try {
    // Try multiple caption endpoints
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=json3`
    ];

    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Caption response:`, JSON.stringify(data).substring(0, 200));
          
          if (data.events && data.events.length > 0) {
            // Extract text from transcript events
            const segments = data.events
              .filter((event: any) => event.segs && event.segs.length > 0)
              .map((event: any) => {
                return event.segs
                  .map((seg: any) => seg.utf8 || '')
                  .join('')
                  .trim();
              })
              .filter((text: string) => text && text.length > 0);

            if (segments.length > 0) {
              return segments.join(' ').replace(/\s+/g, ' ').trim();
            }
          }
        }
      } catch (error) {
        console.log(`Caption URL ${url} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('No captions found');
  } catch (error) {
    console.error('Caption fetching error:', error);
    throw new Error(`Caption extraction failed: ${error.message}`);
  }
}

// Function to get video info and check if captions are available
async function getVideoInfo(videoId: string): Promise<any> {
  try {
    // Try to get video information to see if captions are available
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Video info:`, data);
      return data;
    }
    
    throw new Error('Could not fetch video info');
  } catch (error) {
    console.log(`Video info fetch failed:`, error.message);
    return null;
  }
}

// Function to get audio stream using yt-dlp format approach
async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  try {
    // Use YouTube's player API to get stream information
    const playerApiUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
    
    const requestBody = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20210721.00.00"
        }
      },
      videoId: videoId
    };

    console.log(`Fetching player data for video: ${videoId}`);
    
    const response = await fetch(playerApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Player API request failed: ${response.status}`);
    }

    const playerData = await response.json();
    console.log(`Player response status:`, playerData.playabilityStatus?.status);
    
    if (playerData.playabilityStatus?.status !== 'OK') {
      throw new Error(`Video not playable: ${playerData.playabilityStatus?.reason || 'Unknown reason'}`);
    }

    const streamingData = playerData.streamingData;
    if (!streamingData) {
      throw new Error('No streaming data available in player response');
    }

    // Look for audio formats
    const audioFormats = streamingData.adaptiveFormats?.filter((format: any) => 
      format.mimeType?.startsWith('audio/') && format.url
    );

    if (!audioFormats || audioFormats.length === 0) {
      throw new Error('No audio streams found');
    }

    // Sort by bitrate (prefer higher quality) and return the best one
    audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
    const bestAudio = audioFormats[0];
    
    console.log(`Selected audio format: ${bestAudio.mimeType}, bitrate: ${bestAudio.bitrate}`);
    return bestAudio.url;

  } catch (error) {
    console.error('Audio stream extraction error:', error);
    return null;
  }
}

// Function to download audio and transcribe with OpenAI Whisper
async function transcribeAudioWithWhisper(audioUrl: string, openaiApiKey: string): Promise<string> {
  try {
    console.log('Downloading audio from:', audioUrl.substring(0, 100) + '...');
    
    // Download audio data
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`Downloaded audio buffer: ${audioBuffer.byteLength} bytes`);
    
    // Prepare form data for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
    formData.append('file', audioBlob, 'audio.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    
    console.log('Sending audio to OpenAI Whisper API...');
    
    // Send to OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }
    
    const transcription = await whisperResponse.text();
    console.log(`Transcription completed: ${transcription.length} characters`);
    
    return transcription;
  } catch (error) {
    console.error('Audio transcription error:', error);
    throw new Error(`Audio transcription failed: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl, openaiApiKey } = await req.json();
    
    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`Processing video: ${videoId}`);

    // Get video info first
    const videoInfo = await getVideoInfo(videoId);
    
    // Try to get YouTube captions first
    try {
      console.log('Attempting to fetch YouTube captions...');
      const transcript = await fetchYouTubeCaptions(videoId);
      
      if (transcript && transcript.length > 10) {
        console.log(`Successfully fetched captions (${transcript.length} characters)`);
        
        return new Response(
          JSON.stringify({
            transcript: transcript,
            videoId: videoId,
            source: 'captions',
            success: true,
            videoTitle: videoInfo?.title || 'Unknown'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (captionError) {
      console.log('No captions available:', captionError.message);
    }

    // If no captions and no OpenAI key, return error
    if (!openaiApiKey) {
      throw new Error('No captions available for this video. Please provide an OpenAI API key for audio transcription.');
    }

    // Try audio transcription with OpenAI Whisper
    try {
      console.log('Attempting audio transcription with OpenAI Whisper...');
      
      // Get audio stream URL
      const audioUrl = await getAudioStreamUrl(videoId);
      if (!audioUrl) {
        throw new Error('Could not extract audio stream from video');
      }
      
      // Transcribe audio with Whisper
      const transcript = await transcribeAudioWithWhisper(audioUrl, openaiApiKey);
      
      console.log(`Audio transcription completed (${transcript.length} characters)`);
      
      return new Response(
        JSON.stringify({
          transcript: transcript,
          videoId: videoId,
          source: 'whisper-transcription',
          success: true,
          videoTitle: videoInfo?.title || 'Unknown'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } catch (audioError) {
      console.error('Audio transcription failed:', audioError.message);
      
      return new Response(
        JSON.stringify({
          transcript: `[Audio Transcription Failed]

This video (${videoId}) does not have automatic captions available and audio transcription failed.

Error: ${audioError.message}

This could be due to:
- Video is private or restricted
- Audio stream is not accessible
- OpenAI API key is invalid or has insufficient credits
- Video is too long (Whisper has a 25MB file size limit)
- Network connectivity issues

Please try:
1. Using a different video with captions enabled
2. Checking your OpenAI API key and credits
3. Using a shorter video (under 25MB when downloaded)`,
          videoId: videoId,
          source: 'transcription-failed',
          success: false,
          videoTitle: videoInfo?.title || 'Unknown',
          error: audioError.message
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Error in youtube-transcript function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
