# YouTube Transcript Extractor

A simple web application that extracts transcripts from YouTube videos using the `youtube-transcript-api`. This tool provides a clean, user-friendly interface for getting text transcripts from YouTube videos that have captions available.

## Features

- **YouTube Transcript Extraction**: Extract transcripts from any YouTube video with captions
- **Multiple Language Support**: Automatically tries English, US English, and British English captions
- **Clean Interface**: Simple, responsive web interface
- **Local Storage**: Saves your inputs for convenience
- **Copy & Download**: Easy transcript copying and downloading
- **Error Handling**: Clear error messages for various scenarios
- **Health Check**: Built-in health monitoring endpoint

## Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:5001
   ```

## How to Use

1. **Enter a YouTube URL**: Paste any YouTube video URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)

2. **Click "Extract Transcript"**: The app will automatically extract the transcript if captions are available

3. **View Results**: The transcript will appear in a text area below

4. **Copy or Download**: Use the buttons to copy to clipboard or download as a text file

## Project Structure

```
youtube-transcript-extractor/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Main web interface
└── static/
    ├── styles.css        # CSS styling
    └── script.js         # Frontend JavaScript
```

## API Endpoints

### Main Interface
- `GET /` - Main web interface

### API Endpoints
- `POST /transcribe` - Extract transcript from YouTube URL
  - **Request Body**: `{"youtube_url": "https://www.youtube.com/watch?v=..."}`
  - **Response**: `{"success": true, "transcript": "...", "video_id": "..."}`

- `GET /health` - Health check endpoint
  - **Response**: `{"status": "healthy", "message": "..."}`

## How It Works

1. **URL Parsing**: The app extracts the video ID from various YouTube URL formats
2. **Caption Extraction**: Uses `youtube-transcript-api` to fetch available captions
3. **Language Detection**: Automatically tries multiple English language variants
4. **Text Processing**: Combines caption segments into a single transcript
5. **Response**: Returns the full transcript text

## Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- URLs with additional parameters (timestamps, playlists, etc.)

## Error Handling

The application handles various error scenarios:

- **Invalid URLs**: Clear error messages for malformed YouTube URLs
- **No Captions**: Informative messages when videos don't have captions
- **Network Issues**: Graceful handling of connection problems
- **API Errors**: Detailed error reporting from the transcript API

## Dependencies

- **Flask**: Web framework for the backend
- **youtube-transcript-api**: YouTube caption extraction library
- **flask-cors**: Cross-origin resource sharing support
- **Werkzeug**: WSGI utilities

## Limitations

- **Captions Required**: Only works with videos that have captions/subtitles
- **Language Support**: Primarily optimized for English captions
- **Video Access**: Cannot access private or restricted videos
- **Rate Limiting**: Subject to YouTube's API rate limits

## Troubleshooting

### Common Issues

1. **"No captions available"**
   - The video doesn't have captions/subtitles
   - Try a different video with captions enabled

2. **"Invalid YouTube URL"**
   - Check that the URL is a valid YouTube video link
   - Ensure the video is publicly accessible

3. **Server won't start**
   - Check that port 5001 is not in use
   - Verify all dependencies are installed correctly

4. **Network errors**
   - Check your internet connection
   - Try refreshing the page

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify the YouTube video has captions available
3. Try with a different YouTube video
4. Check the server logs for detailed error information

## Development

### Running in Development Mode

```bash
python app.py
```

The server will start with debug mode enabled and auto-reload on file changes.

### Adding Features

The application is structured for easy extension:

- Add new API endpoints in `app.py`
- Modify the frontend in `templates/index.html`
- Update styling in `static/styles.css`
- Enhance functionality in `static/script.js`

## Security Notes

- The application runs locally and doesn't store any data permanently
- API keys and URLs are saved in browser local storage only
- No data is transmitted to external services except YouTube's caption API

## License

This project is open source and available under the MIT License.

---

**Note**: This tool is for educational and personal use. Please respect YouTube's terms of service and copyright laws when using extracted transcripts.
