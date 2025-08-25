import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Youtube, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptInputProps {
  onTranscriptReceived: (transcript: string, videoId: string, responseData?: any) => void;
}

export function TranscriptInput({ onTranscriptReceived }: TranscriptInputProps) {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
        body: JSON.stringify({ youtubeUrl: url, openaiApiKey: apiKey }),
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
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is only used for this request and is not stored anywhere.
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
        </form>
      </CardContent>
    </Card>
  );
}