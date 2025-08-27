// DOM elements
const transcribeForm = document.getElementById('transcribeForm');
const apiKeyInput = document.getElementById('apiKey');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnLoading = document.getElementById('btnLoading');
const resultDiv = document.getElementById('result');
const transcriptTextarea = document.getElementById('transcript');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Upload form elements
const uploadForm = document.getElementById('uploadForm');
const uploadApiKeyInput = document.getElementById('uploadApiKey');
const audioFileInput = document.getElementById('audioFile');
const uploadBtn = document.getElementById('uploadBtn');
const uploadBtnText = document.getElementById('uploadBtnText');
const uploadBtnLoading = document.getElementById('uploadBtnLoading');
const uploadResultDiv = document.getElementById('uploadResult');
const uploadTranscriptTextarea = document.getElementById('uploadTranscript');
const uploadErrorDiv = document.getElementById('uploadError');
const uploadErrorMessage = document.getElementById('uploadErrorMessage');
const uploadCopyBtn = document.getElementById('uploadCopyBtn');
const uploadDownloadBtn = document.getElementById('uploadDownloadBtn');

// Local storage keys
const API_KEY_STORAGE = 'openai_api_key';
const YOUTUBE_URL_STORAGE = 'youtube_url';
const UPLOAD_API_KEY_STORAGE = 'upload_openai_api_key';

// Auto-save API key to localStorage
apiKeyInput.addEventListener('input', function() {
    localStorage.setItem(API_KEY_STORAGE, this.value);
    updateSavedStatus();
});

// Auto-save YouTube URL to localStorage
youtubeUrlInput.addEventListener('input', function() {
    localStorage.setItem(YOUTUBE_URL_STORAGE, this.value);
    updateSavedStatus();
});

// Auto-save upload API key to localStorage
uploadApiKeyInput.addEventListener('input', function() {
    localStorage.setItem(UPLOAD_API_KEY_STORAGE, this.value);
});

// Load saved values on page load
window.addEventListener('load', function() {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    const savedYoutubeUrl = localStorage.getItem(YOUTUBE_URL_STORAGE);
    const savedUploadApiKey = localStorage.getItem(UPLOAD_API_KEY_STORAGE);
    
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
    if (savedYoutubeUrl) {
        youtubeUrlInput.value = savedYoutubeUrl;
    }
    if (savedUploadApiKey) {
        uploadApiKeyInput.value = savedUploadApiKey;
    }
    
    updateSavedStatus();
});

// Update saved status display
function updateSavedStatus() {
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const urlStatus = document.getElementById('urlStatus');
    
    if (apiKeyInput.value) {
        apiKeyStatus.textContent = '✅ API key saved';
        apiKeyStatus.className = 'saved-status saved';
    } else {
        apiKeyStatus.textContent = '💾 Auto-saving...';
        apiKeyStatus.className = 'saved-status';
    }
    
    if (youtubeUrlInput.value) {
        if (!urlStatus) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'urlStatus';
            statusDiv.className = 'saved-status saved';
            statusDiv.textContent = '✅ URL saved';
            youtubeUrlInput.parentNode.appendChild(statusDiv);
        } else {
            urlStatus.textContent = '✅ URL saved';
            urlStatus.className = 'saved-status saved';
        }
    }
}

// YouTube transcription form submission
transcribeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const youtubeUrl = youtubeUrlInput.value.trim();
    
    if (!youtubeUrl) {
        showError('Please enter a YouTube URL');
        return;
    }
    
    setLoading(true);
    hideError();
    hideResult();
    
    try {
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                youtube_url: youtubeUrl
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showResult(data.transcript);
        } else {
            showError(data.error || 'Failed to extract transcript');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Network error. Please try again.');
    } finally {
        setLoading(false);
    }
});

// Upload form submission
uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const apiKey = uploadApiKeyInput.value.trim();
    const audioFile = audioFileInput.files[0];
    
    if (!apiKey) {
        showUploadError('Please enter your OpenAI API key');
        return;
    }
    
    if (!audioFile) {
        showUploadError('Please select an audio file');
        return;
    }
    
    // Check file size (25MB limit)
    if (audioFile.size > 25 * 1024 * 1024) {
        showUploadError('File too large. Maximum size is 25MB');
        return;
    }
    
    setUploadLoading(true);
    hideUploadError();
    hideUploadResult();
    
    try {
        const formData = new FormData();
        formData.append('api_key', apiKey);
        formData.append('audio_file', audioFile);
        
        const response = await fetch('/transcribe-upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showUploadResult(data.transcript);
        } else {
            showUploadError(data.error || 'Failed to transcribe audio');
        }
    } catch (error) {
        console.error('Error:', error);
        showUploadError('Network error. Please try again.');
    } finally {
        setUploadLoading(false);
    }
});

// Utility functions
function setLoading(loading) {
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function setUploadLoading(loading) {
    if (loading) {
        uploadBtnText.style.display = 'none';
        uploadBtnLoading.style.display = 'inline';
        uploadBtn.disabled = true;
    } else {
        uploadBtnText.style.display = 'inline';
        uploadBtnLoading.style.display = 'none';
        uploadBtn.disabled = false;
    }
}

function showResult(transcript) {
    transcriptTextarea.value = transcript;
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideResult() {
    resultDiv.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    errorDiv.style.display = 'none';
}

function showUploadResult(transcript) {
    uploadTranscriptTextarea.value = transcript;
    uploadResultDiv.style.display = 'block';
    uploadResultDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideUploadResult() {
    uploadResultDiv.style.display = 'none';
}

function showUploadError(message) {
    uploadErrorMessage.textContent = message;
    uploadErrorDiv.style.display = 'block';
    uploadErrorDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideUploadError() {
    uploadErrorDiv.style.display = 'none';
}

// Copy to clipboard functionality
copyBtn.addEventListener('click', function() {
    transcriptTextarea.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!');
});

uploadCopyBtn.addEventListener('click', function() {
    uploadTranscriptTextarea.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!');
});

// Download functionality
downloadBtn.addEventListener('click', function() {
    const transcript = transcriptTextarea.value;
    if (transcript) {
        downloadText(transcript, 'youtube-transcript.txt');
    }
});

uploadDownloadBtn.addEventListener('click', function() {
    const transcript = uploadTranscriptTextarea.value;
    if (transcript) {
        downloadText(transcript, 'audio-transcript.txt');
    }
});

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded!');
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
