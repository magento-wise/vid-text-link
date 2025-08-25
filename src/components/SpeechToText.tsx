import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Square, Play, Loader2, Download, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptionResult {
  text: string;
  timestamp: Date;
  model: string;
  language?: string;
}

export function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini-transcribe');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [prompt, setPrompt] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone",
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      toast({
        title: "Recording Stopped",
        description: "Click 'Transcribe' to convert speech to text",
      });
    }
  }, [isRecording, toast]);

  const transcribeAudio = useCallback(async () => {
    if (!audioUrl) {
      toast({
        title: "No Audio",
        description: "Please record some audio first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert audio blob to base64
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);
      
      // Send to edge function
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: {
          audio: base64Audio,
          model: selectedModel,
          language: selectedLanguage || undefined,
          prompt: prompt || undefined
        }
      });

      if (error) throw error;

      if (data.success) {
        const newTranscription: TranscriptionResult = {
          text: data.text,
          timestamp: new Date(),
          model: data.model,
          language: selectedLanguage || undefined
        };
        
        setTranscriptions(prev => [newTranscription, ...prev]);
        
        toast({
          title: "Transcription Complete",
          description: `Converted ${data.text.length} characters of text`,
        });
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
      
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [audioUrl, selectedModel, selectedLanguage, prompt, toast]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadTranscription = (transcription: TranscriptionResult) => {
    const content = `Transcription - ${transcription.timestamp.toLocaleString()}
Model: ${transcription.model}
${transcription.language ? `Language: ${transcription.language}` : ''}

${transcription.text}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    toast({
      title: "Cleared",
      description: "All transcriptions have been cleared",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            Speech to Text
          </CardTitle>
          <CardDescription>
            Record audio and convert it to text using OpenAI's Whisper models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model and Language Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe (Fast)</SelectItem>
                  <SelectItem value="gpt-4o-transcribe">GPT-4o Transcribe (High Quality)</SelectItem>
                  <SelectItem value="whisper-1">Whisper-1 (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Language (Optional)</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt (Optional)</label>
            <Textarea
              placeholder="Provide context to improve transcription accuracy..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Add context like names, technical terms, or topic information to improve accuracy
            </p>
          </div>

          {/* Recording Controls */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="flex-1 min-w-fit"
            >
              {isRecording ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Recording
                </>
              )}
            </Button>

            {audioUrl && (
              <>
                <Button
                  onClick={transcribeAudio}
                  disabled={isProcessing}
                  variant="outline"
                  size="lg"
                  className="flex-1 min-w-fit"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Transcribe
                    </>
                  )}
                </Button>

                <Button
                  onClick={clearAudio}
                  variant="ghost"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Recorded Audio:</p>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcriptions */}
      {transcriptions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transcriptions ({transcriptions.length})</CardTitle>
              <Button onClick={clearTranscriptions} variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcriptions.map((transcription, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{transcription.timestamp.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <span>Model: {transcription.model}</span>
                    {transcription.language && (
                      <span>| Language: {transcription.language}</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm leading-relaxed">{transcription.text}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(transcription.text)}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadTranscription(transcription)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}