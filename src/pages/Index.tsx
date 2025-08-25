import { useState } from "react";
import { TranscriptInput } from "@/components/TranscriptInput";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { SpeechToText } from "@/components/SpeechToText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);

  const handleTranscriptReceived = (transcriptText: string, id: string, data?: any) => {
    setTranscript(transcriptText);
    setVideoId(id);
    setResponseData(data);
  };

  const handleReset = () => {
    setTranscript(null);
    setVideoId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-background/90" />
        
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              AI Transcription Hub
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Convert YouTube videos to text or record live speech. Powered by OpenAI's advanced Whisper models.
            </p>
          </div>

          <Tabs defaultValue="youtube" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="youtube">YouTube Transcripts</TabsTrigger>
              <TabsTrigger value="speech">Speech to Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="youtube">
              {transcript && videoId ? (
                <TranscriptDisplay 
                  transcript={transcript}
                  videoId={videoId}
                  onReset={handleReset}
                  processLog={responseData?.processLog}
                  captionAttemptDetails={responseData?.captionAttemptDetails}
                  audioAttemptDetails={responseData?.audioAttemptDetails}
                  source={responseData?.source}
                  error={responseData?.error}
                />
              ) : (
                <TranscriptInput onTranscriptReceived={handleTranscriptReceived} />
              )}
            </TabsContent>
            
            <TabsContent value="speech">
              <SpeechToText />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Features Section */}
      {!transcript && (
        <div className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-muted-foreground">Get transcripts in seconds with advanced AI models</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Highly Accurate</h3>
                <p className="text-muted-foreground">AI-powered transcription with 95%+ accuracy</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎤</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Live Recording</h3>
                <p className="text-muted-foreground">Record and transcribe speech in real-time</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
