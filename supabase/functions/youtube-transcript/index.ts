
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
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive'
      }
    });
    
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

// Function to check if video has captions available
async function checkCaptionsAvailability(videoId: string): Promise<boolean> {
  try {
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`
    ];

    for (const url of captionUrls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.events && data.events.length > 0) {
            return true;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return false;
  } catch (error) {
    console.log('Caption availability check failed:', error.message);
    return false;
  }
}

// Function to get audio stream using yt-dlp format approach
async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to get audio stream URL`);
      
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      // Try to get YouTube API key from user input, then environment, then fallback to public key
      // Note: The public key may have rate limits. For production use, set YOUTUBE_API_KEY environment variable
      const youtubeApiKey = userYoutubeApiKey || Deno.env.get('YOUTUBE_API_KEY') || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
      const playerApiUrl = `https://www.youtube.com/youtubei/v1/player?key=${youtubeApiKey}`;
    
    const requestBody = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20231219.01.00",
          clientScreen: "WATCH_FIXED",
          platform: "DESKTOP",
          browserName: "Chrome",
          browserVersion: "120.0.0.0",
          osName: "Windows",
          osVersion: "10.0",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        user: {
          lockedSafetyMode: false
        },
        request: {
          useSsl: true,
          internalExperimentFlags: [],
          consistencyTokenJars: []
        }
      },
      videoId: videoId,
      playbackContext: {
        contentPlaybackContext: {
          vis: 0,
          sffb: false,
          lactMilliseconds: "0"
        }
      },
      racyCheckOk: false,
      contentCheckOk: false
    };

    console.log(`Fetching player data for video: ${videoId}`);
    
    // Enhanced headers to appear more like a real browser
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    const response = await fetch(playerApiUrl, {
      method: 'POST',
      headers: headers,
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
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed for audio stream extraction');
        return null;
      }
      
      // Continue to next attempt
    }
  }
  
  return null;
}

// Alternative function to try different approaches for video data (no API key required)
async function getVideoDataAlternative(videoId: string): Promise<string | null> {
  try {
    // Try using HTML parsing approach with different endpoints (no API key needed)
    const endpoints = [
      `https://www.youtube.com/watch?v=${videoId}`,
      `https://www.youtube.com/embed/${videoId}`,
      `https://www.youtube.com/v/${videoId}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying alternative endpoint (no API key): ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
          }
        });

        if (response.ok) {
          const html = await response.text();
          
          // Look for ytInitialPlayerResponse in the HTML
          const ytInitialMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
          if (ytInitialMatch) {
            const playerResponse = JSON.parse(ytInitialMatch[1]);
            
            if (playerResponse.streamingData?.adaptiveFormats) {
              const audioFormats = playerResponse.streamingData.adaptiveFormats.filter((format: any) => 
                format.mimeType?.startsWith('audio/') && format.url
              );
              
              if (audioFormats.length > 0) {
                audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
                console.log(`Alternative method found audio format: ${audioFormats[0].mimeType}`);
                return audioFormats[0].url;
              }
            }
          }
          
          // Also try looking for other patterns in the HTML
          const audioUrlMatch = html.match(/"audioUrl":"([^"]+)"/);
          if (audioUrlMatch) {
            console.log('Found audio URL in HTML pattern');
            return audioUrlMatch[1].replace(/\\u002F/g, '/');
          }
        }
      } catch (endpointError) {
        console.log(`Alternative endpoint ${endpoint} failed:`, endpointError.message);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Alternative video data extraction error:', error);
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
    const { youtubeUrl, openaiApiKey, youtubeApiKey: userYoutubeApiKey } = await req.json();
    
    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`Processing video: ${videoId}`);
    
    const processLog: string[] = [];
    let captionAttemptDetails: string[] = [];
    let audioAttemptDetails: string[] = [];

    // Get video info first
    const videoInfo = await getVideoInfo(videoId);
    processLog.push(`✓ Video info retrieved: ${videoInfo?.title || 'Unknown'}`);
    
    // Check if captions are available first
    processLog.push('🔍 Checking if video has captions available...');
    const hasCaptions = await checkCaptionsAvailability(videoId);
    
    if (hasCaptions) {
      processLog.push('✓ Captions detected as available');
    } else {
      processLog.push('✗ No captions detected - will need audio transcription');
    }
    
    // Try to get YouTube captions first
    try {
      console.log('Attempting to fetch YouTube captions...');
      processLog.push('🔍 Attempting to fetch YouTube captions...');
      
      const transcript = await fetchYouTubeCaptions(videoId);
      
      if (transcript && transcript.length > 10) {
        console.log(`Successfully fetched captions (${transcript.length} characters)`);
        processLog.push(`✓ Successfully fetched captions (${transcript.length} characters)`);
        
        return new Response(
          JSON.stringify({
            transcript: transcript,
            videoId: videoId,
            source: 'captions',
            success: true,
            videoTitle: videoInfo?.title || 'Unknown',
            processLog: processLog
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (captionError) {
      console.log('No captions available:', captionError.message);
      processLog.push(`✗ Caption extraction failed: ${captionError.message}`);
      captionAttemptDetails.push(`Caption error: ${captionError.message}`);
    }

    // If no captions and no OpenAI key, return detailed error
    if (!openaiApiKey) {
      processLog.push('✗ No OpenAI API key provided for audio transcription');
      
      return new Response(
        JSON.stringify({
          transcript: `[No Transcript Available]

Video: ${videoInfo?.title || 'Unknown'} (${videoId})

Process Log:
${processLog.join('\n')}

This video does not have automatic captions available and no OpenAI API key was provided for audio transcription.

To get a transcript, please:
1. Provide an OpenAI API key for audio transcription (recommended)
2. Try a different video that has captions enabled
3. Look for videos with the "CC" (closed captions) button in YouTube

Note: Due to YouTube's bot detection measures, videos with existing captions are much more reliable than audio transcription.`,
          videoId: videoId,
          source: 'no-api-key',
          success: false,
          videoTitle: videoInfo?.title || 'Unknown',
          error: 'No captions available and no OpenAI API key provided',
          processLog: processLog,
          captionAttemptDetails: captionAttemptDetails
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Try audio transcription with OpenAI Whisper
    try {
      console.log('Attempting audio transcription with OpenAI Whisper...');
      processLog.push('🎵 Attempting audio transcription with OpenAI Whisper...');
      
      // Get audio stream URL - try primary method first (uses YouTube API key if available)
      processLog.push('🔗 Extracting audio stream URL (primary method with API key)...');
      let audioUrl = await getAudioStreamUrl(videoId);
      
      // If primary method fails, try alternative approach (no API key required)
      if (!audioUrl) {
        processLog.push('🔄 Primary method failed, trying alternative approach (no API key)...');
        audioAttemptDetails.push('Primary method failed, trying alternative approach (no API key)');
        audioUrl = await getVideoDataAlternative(videoId);
      }
      
      if (!audioUrl) {
        audioAttemptDetails.push('Both primary and alternative methods failed to extract audio stream URL');
        throw new Error('Could not extract audio stream from video - YouTube may be blocking automated requests');
      }
      
      processLog.push(`✓ Audio stream URL extracted (${audioUrl.substring(0, 50)}...)`);
      audioAttemptDetails.push(`Audio URL length: ${audioUrl.length} characters`);
      
      // Transcribe audio with Whisper
      processLog.push('🤖 Sending audio to OpenAI Whisper...');
      const transcript = await transcribeAudioWithWhisper(audioUrl, openaiApiKey);
      
      console.log(`Audio transcription completed (${transcript.length} characters)`);
      processLog.push(`✓ Audio transcription completed (${transcript.length} characters)`);
      
      return new Response(
        JSON.stringify({
          transcript: transcript,
          videoId: videoId,
          source: 'whisper-transcription',
          success: true,
          videoTitle: videoInfo?.title || 'Unknown',
          processLog: processLog,
          audioAttemptDetails: audioAttemptDetails
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
      
    } catch (audioError) {
      console.error('Audio transcription failed:', audioError.message);
      processLog.push(`✗ Audio transcription failed: ${audioError.message}`);
      audioAttemptDetails.push(`Audio transcription error: ${audioError.message}`);
      
      return new Response(
        JSON.stringify({
          transcript: `[Audio Transcription Failed]

Video: ${videoInfo?.title || 'Unknown'} (${videoId})

Process Log:
${processLog.join('\n')}

Caption Attempt Details:
${captionAttemptDetails.join('\n')}

Audio Attempt Details:
${audioAttemptDetails.join('\n')}

Error Details:
${audioError.message}

This could be due to:
- YouTube bot detection blocking automated requests
- Video is private or restricted
- Audio stream is not accessible
- OpenAI API key is invalid or has insufficient credits
- Video is too long (Whisper has a 25MB file size limit)
- Network connectivity issues

Solutions to try:
1. Use a video that has YouTube captions available (most reliable)
2. Try a different YouTube video (some videos have stricter bot protection)
3. Check your OpenAI API key and credits
4. Use a shorter video (under 25MB when downloaded)
5. Wait a few minutes and try again (rate limiting)
6. Try during off-peak hours when YouTube's bot detection may be less strict

Note: YouTube has recently increased bot detection measures, making automated video processing more challenging. Videos with existing captions are the most reliable option.`,
          videoId: videoId,
          source: 'transcription-failed',
          success: false,
          videoTitle: videoInfo?.title || 'Unknown',
          error: audioError.message,
          processLog: processLog,
          captionAttemptDetails: captionAttemptDetails,
          audioAttemptDetails: audioAttemptDetails
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
        success: false,
        processLog: [`✗ Function error: ${error.message}`]
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
