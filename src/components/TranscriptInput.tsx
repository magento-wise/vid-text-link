import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Youtube, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptInputProps {
  onTranscriptReceived: (transcript: string, videoId: string) => void;
}

export function TranscriptInput({ onTranscriptReceived }: TranscriptInputProps) {
  const [url, setUrl] = useState("");
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
      // This would normally call your Supabase edge function
      // For now, we'll simulate the process
      toast({
        title: "Processing...",
        description: "Starting video transcription. This may take a few minutes.",
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock transcript for demonstration
      const mockTranscript = `This is a sample transcript for video ${videoId}. In a real implementation, this would be the actual transcript from AssemblyAI after processing the YouTube video audio.

The video discusses various topics and provides insights that users can now read in text format instead of watching the entire video.

This transcript service allows users to quickly scan through video content and find the information they need without having to watch the entire video.`;

      onTranscriptReceived(mockTranscript, videoId);
      
      toast({
        title: "Success!",
        description: "Transcript generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process video. Please try again.",
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