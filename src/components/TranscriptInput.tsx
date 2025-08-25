import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Youtube, Sparkles, Save, Trash2, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptInputProps {
  onTranscriptReceived: (transcript: string, videoId: string, responseData?: any) => void;
}

export function TranscriptInput({ onTranscriptReceived }: TranscriptInputProps) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [isYoutubeApiKeySaved, setIsYoutubeApiKeySaved] = useState(false);
  const [testResults, setTestResults] = useState<{
    openai: boolean | null;
    youtube: boolean | null;
    url: boolean | null;
  }>({ openai: null, youtube: null, url: null });
  const { toast } = useToast();

  // Load saved API keys from localStorage on component mount
  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem('openai_api_key');
    const savedYouTubeKey = localStorage.getItem('youtube_api_key');
    
    if (savedOpenAIKey) {
      setApiKey(savedOpenAIKey);
      setIsApiKeySaved(true);
    }
    
    if (savedYouTubeKey) {
      setYoutubeApiKey(savedYouTubeKey);
      setIsYoutubeApiKeySaved(true);
    }
  }, []);

  // Test OpenAI API key
  const testOpenAIKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Test YouTube API key
  const testYoutubeKey = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${key}&maxResults=1`);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Test YouTube URL
  const testYouTubeUrl = async (url: string): Promise<boolean> => {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) return false;
      
      // Test if video is accessible
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Test all inputs
  const testAllInputs = async () => {
    setIsTesting(true);
    setTestResults({ openai: null, youtube: null, url: null });

    const results = {
      openai: false,
      youtube: false,
      url: false
    };

    // Test OpenAI API key
    if (apiKey.trim()) {
      results.openai = await testOpenAIKey(apiKey);
    }

    // Test YouTube API key (if provided)
    if (youtubeApiKey.trim()) {
      results.youtube = await testYoutubeKey(youtubeApiKey);
    }

    // Test YouTube URL
    if (url.trim()) {
      results.url = await testYouTubeUrl(url);
    }

    setTestResults(results);

    // Show results
    const messages = [];
    if (apiKey.trim() && results.openai) messages.push("✅ OpenAI API key is valid");
    if (apiKey.trim() && !results.openai) messages.push("❌ OpenAI API key is invalid");
    if (youtubeApiKey.trim() && results.youtube) messages.push("✅ YouTube API key is valid");
    if (youtubeApiKey.trim() && !results.youtube) messages.push("❌ YouTube API key is invalid");
    if (url.trim() && results.url) messages.push("✅ YouTube URL is accessible");
    if (url.trim() && !results.url) messages.push("❌ YouTube URL is not accessible");

    toast({
      title: "Test Results",
      description: messages.length > 0 ? messages.join(", ") : "No inputs to test",
      variant: results.openai && results.url ? "default" : "destructive",
    });

    setIsTesting(false);
  };

  // Save API key to localStorage
  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setIsApiKeySaved(true);
      toast({
        title: "Saved!",
        description: "OpenAI API key saved to browser storage",
      });
    }
  };

  // Remove API key from localStorage
  const removeApiKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey("");
    setIsApiKeySaved(false);
    setTestResults(prev => ({ ...prev, openai: null }));
    toast({
      title: "Removed!",
      description: "OpenAI API key removed from browser storage",
    });
  };

  // Save YouTube API key to localStorage
  const saveYoutubeApiKey = () => {
    if (youtubeApiKey.trim()) {
      localStorage.setItem('youtube_api_key', youtubeApiKey);
      setIsYoutubeApiKeySaved(true);
      toast({
        title: "Saved!",
        description: "YouTube API key saved to browser storage",
      });
    }
  };

  // Remove YouTube API key from localStorage
  const removeYoutubeApiKey = () => {
    localStorage.removeItem('youtube_api_key');
    setYoutubeApiKey("");
    setIsYoutubeApiKeySaved(false);
    setTestResults(prev => ({ ...prev, youtube: null }));
    toast({
      title: "Removed!",
      description: "YouTube API key removed from browser storage",
    });
  };

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    if (!validateYouTubeUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      toast({
        title: "Error",
        description: "Could not extract video ID from URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      toast({
        title: "Processing...",
        description: "Starting video transcription. This may take a few minutes.",
      });

      // Call the Supabase edge function
      const response = await fetch('https://caeymijirdxdoisswgae.supabase.co/functions/v1/youtube-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          youtubeUrl: url, 
          openaiApiKey: apiKey,
          youtubeApiKey: youtubeApiKey || undefined 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      onTranscriptReceived(data.transcript, data.videoId, data);
      
      toast({
        title: data.success ? "Success!" : "Partial Success",
        description: data.success 
          ? `Transcript generated successfully using ${data.source === 'captions' ? 'YouTube captions' : 'AI transcription'}`
          : `Process completed with issues. Check the process log for details.`,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-elegant">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl bg-gradient-hero bg-clip-text text-transparent">
          <Youtube className="h-8 w-8 text-primary" />
          YouTube Transcript Generator
        </CardTitle>
        <CardDescription className="text-lg">
          Paste any YouTube URL to get the video transcript instantly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="openai-key" className="text-sm font-medium">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
                className="h-12 text-lg flex-1"
              />
              {isApiKeySaved ? (
                <Button
                  type="button"
                  onClick={removeApiKey}
                  variant="outline"
                  size="lg"
                  className="h-12 px-3"
                  title="Remove saved API key"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={saveApiKey}
                  variant="outline"
                  size="lg"
                  className="h-12 px-3"
                  title="Save API key to browser"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isApiKeySaved 
                ? "✅ API key saved in browser storage" 
                : "Your API key is only used for this request and is not stored anywhere."
              }
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="youtube-api-key" className="text-sm font-medium">
              YouTube API Key (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                id="youtube-api-key"
                type="password"
                placeholder="AIzaSy..."
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                disabled={isLoading}
                className="h-12 text-lg flex-1"
              />
              {isYoutubeApiKeySaved ? (
                <Button
                  type="button"
                  onClick={removeYoutubeApiKey}
                  variant="outline"
                  size="lg"
                  className="h-12 px-3"
                  title="Remove saved YouTube API key"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={saveYoutubeApiKey}
                  variant="outline"
                  size="lg"
                  className="h-12 px-3"
                  title="Save YouTube API key to browser"
                >
                  <Save className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isYoutubeApiKeySaved 
                ? "✅ YouTube API key saved in browser storage" 
                : "Optional: Add your own YouTube API key for better rate limits. If not provided, a public key will be used."
              }
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="youtube-url" className="text-sm font-medium">
              YouTube URL
            </label>
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="h-12 text-lg"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading} 
            variant="hero"
            size="lg"
            className="w-full h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Transcript
              </>
            )}
          </Button>
          <Button 
            type="button" 
            onClick={testAllInputs} 
            disabled={isLoading || isTesting} 
            variant="outline"
            size="lg"
            className="w-full h-12 text-lg"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-5 w-5" />
                Test All Inputs
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}