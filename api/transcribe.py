from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
import json
import re

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
        r'youtu\.be\/([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # Get request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            youtube_url = data.get('youtube_url', '').strip()
            
            if not youtube_url:
                response = {
                    'success': False,
                    'error': 'YouTube URL is required'
                }
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Extract video ID
            video_id = extract_video_id(youtube_url)
            if not video_id:
                response = {
                    'success': False,
                    'error': 'Invalid YouTube URL'
                }
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Get transcript using youtube-transcript-api
            try:
                # Create an instance of YouTubeTranscriptApi
                ytt_api = YouTubeTranscriptApi()
                
                # Fetch the transcript data directly
                transcript_data = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
                
                # Combine all transcript segments into one text
                full_transcript = ' '.join([segment.text for segment in transcript_data])
                
                response = {
                    'success': True,
                    'transcript': full_transcript,
                    'video_id': video_id,
                    'segments': [{'text': segment.text, 'start': segment.start, 'duration': segment.duration} for segment in transcript_data],
                    'message': 'Transcript extracted successfully'
                }
                
            except Exception as e:
                response = {
                    'success': False,
                    'error': f'Could not extract transcript: {str(e)}',
                    'video_id': video_id,
                    'message': 'This video may not have captions available'
                }
            
        except Exception as e:
            response = {
                'success': False,
                'error': f'Server error: {str(e)}'
            }
        
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
