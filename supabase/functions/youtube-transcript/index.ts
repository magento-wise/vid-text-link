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

// Function to download audio from YouTube using ytdl-core equivalent
async function downloadYouTubeAudio(videoId: string): Promise<ArrayBuffer> {
  // For security and reliability, we'll use youtube-dl-exec or similar API
  // This is a simplified example - in production you'd use a proper audio extraction service
  
  try {
    // Using a free YouTube audio extraction API
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to access video: ${response.statusText}`);
    }

    // In a real implementation, you would:
    // 1. Extract audio stream URLs from video page
    // 2. Download the audio stream
    // 3. Convert to appropriate format if needed
    
    // For now, we'll simulate this by creating a mock audio buffer
    // In production, replace this with actual audio extraction
    throw new Error("Audio extraction not implemented - please provide audio file directly");
    
  } catch (error) {
    throw new Error(`Failed to extract audio: ${error.message}`);
  }
}

// Function to transcribe audio using OpenAI Whisper
async function transcribeAudio(audioBuffer: ArrayBuffer, apiKey: string): Promise<string> {
  // Create FormData for the OpenAI API
  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.text;
}

// Function to try fetching YouTube captions first
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // Try to fetch transcript from YouTube's transcript API
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`);
    
    if (!response.ok) {
      throw new Error('No transcript available');
    }

    const data = await response.json();
    
    if (!data.events) {
      throw new Error('No transcript events found');
    }

    // Extract text from transcript events
    const segments = data.events
      .filter((event: any) => event.segs)
      .map((event: any) => {
        const text = event.segs.map((seg: any) => seg.utf8).join('').trim();
        return text;
      })
      .filter((text: string) => text);

    return segments.join(' ');
  } catch (error) {
    throw new Error(`Caption extraction failed: ${error.message}`);
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

    // First try to get YouTube captions
    try {
      const transcript = await fetchYouTubeTranscript(videoId);
      console.log('Successfully fetched YouTube captions');
      
      return new Response(
        JSON.stringify({
          transcript: transcript,
          videoId: videoId,
          source: 'captions',
          success: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (captionError) {
      console.log('No captions available, would need audio transcription');
      
      // Check if OpenAI API key is provided
      if (!openaiApiKey) {
        throw new Error('No captions available for this video. OpenAI API key is required for audio transcription.');
      }

      // For demonstration purposes, we'll return a mock transcript
      // In production, you would implement actual audio extraction and transcription
      const mockTranscript = `[Audio Transcription - Mock]

This video does not have automatic captions available, so audio transcription would be required.

To implement real audio transcription:
1. Extract audio from YouTube video using youtube-dl or similar tool
2. Send audio file to OpenAI Whisper API
3. Return the transcribed text

The OpenAI API key you provided would be used to call the Whisper API for actual transcription.

Note: This is currently a demonstration. Full audio extraction and transcription requires additional infrastructure for handling large audio files and processing time.`;

      return new Response(
        JSON.stringify({
          transcript: mockTranscript,
          videoId: videoId,
          source: 'whisper-mock',
          success: true,
          note: 'This is a mock response. Real audio transcription requires additional setup.'
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});