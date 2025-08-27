from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import logging
import re
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Handle YouTube transcription requests"""
    try:
        data = request.get_json()
        youtube_url = data.get('youtube_url', '').strip()
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        # Extract video ID
        video_id = extract_video_id(youtube_url)
        if not video_id:
            return jsonify({'error': 'Invalid YouTube URL'}), 400
        
        logger.info(f"Processing video ID: {video_id}")
        
        # Get transcript using youtube-transcript-api
        try:
            # Create an instance of YouTubeTranscriptApi
            ytt_api = YouTubeTranscriptApi()
            
            # Fetch the transcript data directly
            transcript_data = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            
            # Combine all transcript segments into one text
            full_transcript = ' '.join([segment.text for segment in transcript_data])
            
            logger.info(f"Successfully extracted transcript: {len(full_transcript)} characters")
            
            return jsonify({
                'success': True,
                'transcript': full_transcript,
                'video_id': video_id,
                'segments': [{'text': segment.text, 'start': segment.start, 'duration': segment.duration} for segment in transcript_data],
                'message': 'Transcript extracted successfully'
            })
            
        except Exception as e:
            logger.error(f"Transcript extraction failed: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Could not extract transcript: {str(e)}',
                'video_id': video_id,
                'message': 'This video may not have captions available'
            }), 400
            
    except Exception as e:
        logger.error(f"Request processing error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/transcribe-upload', methods=['POST'])
def transcribe_upload():
    """Handle direct audio file uploads for transcription"""
    try:
        # Check if file was uploaded
        if 'audio_file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file size (25MB limit)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 25 * 1024 * 1024:  # 25MB
            return jsonify({'error': 'File too large. Maximum size is 25MB'}), 400
        
        # Check file type
        allowed_extensions = {'.mp3', '.m4a', '.wav', '.flac', '.ogg', '.webm', '.mp4'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': f'Unsupported file type. Allowed: {", ".join(allowed_extensions)}'}), 400
        
        # For now, return a message that direct audio transcription is not implemented
        # This would require OpenAI Whisper API integration
        return jsonify({
            'success': False,
            'error': 'Direct audio transcription is not implemented in this version. Please use YouTube videos with captions.',
            'message': 'This feature requires OpenAI Whisper API integration'
        }), 400
        
    except Exception as e:
        logger.error(f"Upload processing error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'YouTube Transcript API is running'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)
