
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

    // For now, return an informative message about audio transcription
    // In a production environment, you would implement actual audio extraction here
    console.log('Would attempt audio transcription with OpenAI API');
    
    return new Response(
      JSON.stringify({
        transcript: `[Audio Transcription Required]

This video (${videoId}) does not have automatic captions available.

To get the transcript, audio transcription would be needed using OpenAI's Whisper API. However, this requires:

1. Extracting audio from the YouTube video
2. Converting it to a compatible format
3. Sending it to OpenAI's Whisper API
4. Processing the transcription response

Current limitations:
- YouTube audio extraction requires additional infrastructure
- Large audio files need special handling
- Processing can take several minutes for long videos

Your OpenAI API key was provided and would be used for the Whisper API call in a full implementation.

Try finding a video with automatic captions, or consider using a video that has closed captions enabled.`,
        videoId: videoId,
        source: 'audio-transcription-needed',
        success: true,
        videoTitle: videoInfo?.title || 'Unknown',
        note: 'Audio transcription infrastructure needed for videos without captions'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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
