
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Version: 2025-01-25-21-45 - Third-party service approach
// This ensures the latest code is deployed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

// Function to fetch YouTube captions using multiple approaches
async function fetchYouTubeCaptions(videoId: string): Promise<string> {
  try {
    console.log(`Attempting to fetch captions for video: ${videoId}`);
    
    // Approach 1: Try multiple caption endpoints with different formats
    const captionEndpoints = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv1`,
      `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv2`
    ];

    for (const url of captionEndpoints) {
      try {
        console.log(`Trying caption endpoint: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`Caption response content-type: ${contentType}`);
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            console.log(`Caption JSON response:`, JSON.stringify(data).substring(0, 300));
            
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
                const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
                console.log(`Successfully extracted captions: ${transcript.length} characters`);
                return transcript;
              }
            }
          } else if (contentType?.includes('text/')) {
            // Handle text-based caption formats (VTT, SRV, etc.)
            const text = await response.text();
            console.log(`Caption text response:`, text.substring(0, 300));
            
            // Parse VTT format
            if (url.includes('fmt=vtt') || text.includes('WEBVTT')) {
              const vttLines = text.split('\n');
              const captions = vttLines
                .filter(line => line.trim() && !line.startsWith('WEBVTT') && !line.includes('-->') && !line.match(/^\d+$/))
                .map(line => line.trim())
                .filter(line => line.length > 0);
              
              if (captions.length > 0) {
                const transcript = captions.join(' ').replace(/\s+/g, ' ').trim();
                console.log(`Successfully extracted VTT captions: ${transcript.length} characters`);
                return transcript;
              }
            }
            
            // Parse SRV format
            if (url.includes('fmt=srv') || text.includes('<text')) {
              const textMatches = text.match(/<text[^>]*>([^<]+)<\/text>/g);
              if (textMatches) {
                const captions = textMatches
                  .map(match => match.replace(/<text[^>]*>([^<]+)<\/text>/, '$1'))
                  .map(text => text.trim())
                  .filter(text => text.length > 0);
                
                if (captions.length > 0) {
                  const transcript = captions.join(' ').replace(/\s+/g, ' ').trim();
                  console.log(`Successfully extracted SRV captions: ${transcript.length} characters`);
                  return transcript;
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`Caption endpoint ${url} failed:`, error.message);
        continue;
      }
    }

    // Approach 2: Try to get captions from the video page HTML
    console.log('Trying to extract captions from video page HTML...');
    try {
      const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`Video page HTML length: ${html.length} characters`);
        
        // Look for captions in the HTML
        const captionPatterns = [
          /"captions":\s*({[^}]+})/,
          /"captionTracks":\s*(\[[^\]]+\])/,
          /"caption":\s*"([^"]+)"/,
          /"transcript":\s*"([^"]+)"/,
          /"subtitle":\s*"([^"]+)"/
        ];

        for (const pattern of captionPatterns) {
          const match = html.match(pattern);
          if (match) {
            console.log(`Found caption pattern: ${pattern.source}`);
            try {
              if (match[1].startsWith('{') || match[1].startsWith('[')) {
                const captionData = JSON.parse(match[1]);
                if (captionData.text || captionData.content) {
                  const transcript = (captionData.text || captionData.content).replace(/\s+/g, ' ').trim();
                  console.log(`Successfully extracted captions from HTML: ${transcript.length} characters`);
                  return transcript;
                }
              } else {
                const transcript = match[1].replace(/\s+/g, ' ').trim();
                console.log(`Successfully extracted captions from HTML: ${transcript.length} characters`);
                return transcript;
              }
            } catch (parseError) {
              console.log(`Failed to parse caption data: ${parseError.message}`);
            }
          }
        }

        // Look for ytInitialPlayerResponse which might contain caption data
        const ytInitialMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (ytInitialMatch) {
          try {
            const playerResponse = JSON.parse(ytInitialMatch[1]);
            console.log(`Found ytInitialPlayerResponse in HTML`);
            
            // Check for captions in player response
            if (playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
              const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
              for (const track of captionTracks) {
                if (track.baseUrl) {
                  console.log(`Found caption track URL: ${track.baseUrl}`);
                  // Try to fetch the caption track
                  const captionResponse = await fetch(track.baseUrl);
                  if (captionResponse.ok) {
                    const captionText = await captionResponse.text();
                    // Parse the caption XML
                    const textMatches = captionText.match(/<text[^>]*>([^<]+)<\/text>/g);
                    if (textMatches) {
                      const captions = textMatches
                        .map(match => match.replace(/<text[^>]*>([^<]+)<\/text>/, '$1'))
                        .map(text => text.trim())
                        .filter(text => text.length > 0);
                      
                      if (captions.length > 0) {
                        const transcript = captions.join(' ').replace(/\s+/g, ' ').trim();
                        console.log(`Successfully extracted captions from track: ${transcript.length} characters`);
                        return transcript;
                      }
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            console.log(`Failed to parse ytInitialPlayerResponse: ${parseError.message}`);
          }
        }
      }
    } catch (htmlError) {
      console.log(`HTML caption extraction failed:`, htmlError.message);
    }

    // Approach 3: Try using a proxy service to access captions
    console.log('Trying proxy service for captions...');
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`)}`;
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const data = await response.json();
        if (data.events && data.events.length > 0) {
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
            const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
            console.log(`Successfully extracted captions via proxy: ${transcript.length} characters`);
            return transcript;
          }
        }
      }
    } catch (proxyError) {
      console.log(`Proxy caption extraction failed:`, proxyError.message);
    }
    
    throw new Error('No captions found after trying all approaches');
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
    console.log(`Checking caption availability for video: ${videoId}`);
    
    const captionUrls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=vtt`
    ];

    for (const url of captionUrls) {
      try {
        console.log(`Checking caption URL: ${url}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive'
          }
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`Caption check response: ${response.status} - ${contentType}`);
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            if (data.events && data.events.length > 0) {
              console.log(`✓ Captions found via JSON endpoint`);
              return true;
            }
          } else if (contentType?.includes('text/')) {
            const text = await response.text();
            if (text.length > 100 && (text.includes('<text') || text.includes('WEBVTT'))) {
              console.log(`✓ Captions found via text endpoint`);
              return true;
            }
          }
        }
      } catch (error) {
        console.log(`Caption check failed for ${url}:`, error.message);
        continue;
      }
    }
    
    console.log(`✗ No captions found in availability check`);
    return false;
  } catch (error) {
    console.log('Caption availability check failed:', error.message);
    return false;
  }
}

// Function to get audio stream using third-party service
async function getAudioStreamUrl(videoId: string): Promise<string | null> {
  const maxRetries = 2;
  const retryDelay = 2000; // 2 seconds between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to get audio stream URL using third-party service`);
      
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // Try using a public YouTube info API service
      const apiUrls = [
        `https://api.vevioz.com/@api/json/mp3/${videoId}`,
        `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`,
        `https://api.vevioz.com/@api/json/mp4/${videoId}`
      ];

      for (const apiUrl of apiUrls) {
        try {
          console.log(`Trying API: ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            // Check for different response formats
            if (data.url) {
              console.log(`Found audio URL from API: ${data.url.substring(0, 100)}...`);
              return data.url;
            }
            
            if (data.download_url) {
              console.log(`Found download URL from API: ${data.download_url.substring(0, 100)}...`);
              return data.download_url;
            }
            
            if (data.link) {
              console.log(`Found link from API: ${data.link.substring(0, 100)}...`);
              return data.link;
            }
          }
        } catch (apiError) {
          console.log(`API ${apiUrl} failed:`, apiError.message);
          continue;
        }
      }

      // If third-party APIs fail, try a different approach using a proxy service
      console.log('Third-party APIs failed, trying proxy approach...');
      
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
      
      const proxyResponse = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (proxyResponse.ok) {
        const html = await proxyResponse.text();
        
        // Look for audio URLs in the proxied HTML
        const audioPatterns = [
          /"audioUrl":"([^"]+)"/,
          /"url":"([^"]*audio[^"]*)"/,
          /audioUrl=([^&\s]+)/,
          /"adaptiveFormats":\[([^\]]+)\]/,
          /"formats":\[([^\]]+)\]/
        ];

        for (const pattern of audioPatterns) {
          const match = html.match(pattern);
          if (match) {
            console.log(`Found pattern match: ${pattern.source}`);
            try {
              const urlMatch = match[1].match(/"url":"([^"]+)"/);
              if (urlMatch && urlMatch[1].includes('audio')) {
                const audioUrl = urlMatch[1].replace(/\\u002F/g, '/');
                console.log(`Extracted audio URL from proxy: ${audioUrl.substring(0, 100)}...`);
                return audioUrl;
              }
            } catch (patternError) {
              console.log(`Pattern extraction failed: ${patternError.message}`);
            }
          }
        }
      }

      throw new Error('All third-party services failed to provide audio stream');

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed for audio stream extraction');
        return null;
      }
    }
  }
  
  return null;
}

// Alternative function using different approach (no API key required)
async function getVideoDataAlternative(videoId: string): Promise<string | null> {
  try {
    // Try using different public services
    const services = [
      {
        name: 'Y2Mate API',
        url: `https://www.y2mate.com/youtube/${videoId}`,
        extractor: async (html: string) => {
          const match = html.match(/k__id\s*=\s*"([^"]+)"/);
          if (match) {
            const kId = match[1];
            const convertUrl = `https://www.y2mate.com/convert/${videoId}/${kId}`;
            const convertResponse = await fetch(convertUrl);
            if (convertResponse.ok) {
              const convertData = await convertResponse.json();
              return convertData.url;
            }
          }
          return null;
        }
      },
      {
        name: 'SaveFrom API',
        url: `https://en.savefrom.net/${videoId}`,
        extractor: (html: string) => {
          const match = html.match(/download_url["\s]*:["\s]*"([^"]+)"/);
          return match ? match[1] : null;
        }
      },
      {
        name: 'YoutubeMP3 API',
        url: `https://youtubemp3.to/download/${videoId}`,
        extractor: (html: string) => {
          const match = html.match(/href="([^"]*\.mp3[^"]*)"/);
          return match ? match[1] : null;
        }
      }
    ];

    for (const service of services) {
      try {
        console.log(`Trying service: ${service.name}`);
        
        const response = await fetch(service.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });

        if (response.ok) {
          const html = await response.text();
          const audioUrl = await service.extractor(html);
          
          if (audioUrl) {
            console.log(`Service ${service.name} found audio URL`);
            return audioUrl;
          }
        }
      } catch (serviceError) {
        console.log(`Service ${service.name} failed:`, serviceError.message);
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

  // Log deployment version for debugging
  console.log('YouTube Transcript Function - Version: 2025-01-25-21-45 - Third-party service approach');

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
    
    // Always try caption extraction first (skip availability check)
    processLog.push('🔍 Attempting to fetch YouTube captions...');
    
    try {
      console.log('Attempting to fetch YouTube captions...');
      
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
      
      // Get audio stream URL - try primary method first (third-party services)
      processLog.push('🔗 Extracting audio stream URL (third-party services)...');
      let audioUrl = await getAudioStreamUrl(videoId);
      
      // If primary method fails, try alternative approach (different services)
      if (!audioUrl) {
        processLog.push('🔄 Primary method failed, trying alternative services...');
        audioAttemptDetails.push('Primary method failed, trying alternative services');
        audioUrl = await getVideoDataAlternative(videoId);
      }
      
      if (!audioUrl) {
        audioAttemptDetails.push('Both third-party services failed to extract audio stream URL');
        throw new Error('Could not extract audio stream from video - all third-party services failed');
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
- YouTube blocking HTML parsing requests (bot detection)
- Video is private or restricted
- Audio stream is not accessible
- OpenAI API key is invalid or has insufficient credits
- Video is too long (Whisper has a 25MB file size limit)
- Network connectivity issues

Solutions to try:
1. Use a video that has YouTube captions available (most reliable)
2. Try a different YouTube video (some videos have stricter protection)
3. Check your OpenAI API key and credits
4. Use a shorter video (under 25MB when downloaded)
5. Wait a few minutes and try again (rate limiting)
6. Try during off-peak hours when YouTube's protection may be less strict

Note: YouTube has recently increased protection measures against automated requests. Videos with existing captions are the most reliable option.`,
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
