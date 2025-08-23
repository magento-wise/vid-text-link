import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, Youtube, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptDisplayProps {
  transcript: string;
  videoId: string;
  onReset: () => void;
}

export function TranscriptDisplay({ transcript, videoId, onReset }: TranscriptDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Transcript copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transcript",
        variant: "destructive",
      });
    }
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Transcript saved to your device",
    });
  };

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Video Info Card */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Youtube className="h-6 w-6 text-primary" />
            Video Transcript Ready
          </CardTitle>
          <CardDescription>
            <a 
              href={youtubeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {youtubeUrl}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={copyToClipboard}
              variant="glow"
              size="sm"
              className="flex-1 min-w-fit"
            >
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Transcript
                </>
              )}
            </Button>
            <Button
              onClick={downloadTranscript}
              variant="outline"
              size="sm"
              className="flex-1 min-w-fit"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="flex-1 min-w-fit"
            >
              New Video
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Card */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>
            Full transcript of the video content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="max-h-96 overflow-y-auto bg-muted/50 rounded-lg p-4 prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">
                {transcript}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}