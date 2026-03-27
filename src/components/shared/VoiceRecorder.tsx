'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  language?: 'ar' | 'en';
  className?: string;
}

export default function VoiceRecorder({ onTranscript, language = 'ar', className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Send to transcription API
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);
          formData.append('language', language);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          console.log('Transcribe API response:', response.status, data);

          if (!response.ok || data.fallback) {
            console.warn('Mistral transcription failed:', data);
            setError(language === 'ar' ? 'فشل التعرف على الصوت. حاول مرة أخرى.' : 'Transcription failed. Try again.');
          } else if (data.text) {
            onTranscript(data.text);
          } else {
            setError(language === 'ar' ? 'لم يتم التعرف على كلام.' : 'No speech detected.');
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
          setError(language === 'ar' ? 'خطأ في معالجة الصوت.' : 'Audio processing error.');
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Recording error:', err);
      setError('فشل الوصول إلى الميكروفون');
      setIsRecording(false);
    }
  }, [language, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={cn(
          "relative p-4 rounded-full transition-all duration-300",
          isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
            : "bg-primary hover:bg-primary/90 text-primary-foreground",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
        title={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
        
        {isRecording && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>

      {error && (
        <p className="text-xs text-destructive text-center max-w-[200px]">
          {error}
        </p>
      )}
      
      {isRecording && (
        <p className="text-xs text-muted-foreground animate-pulse">
          جاري التسجيل...
        </p>
      )}
      
      {isProcessing && (
        <p className="text-xs text-muted-foreground">
          جاري المعالجة...
        </p>
      )}
    </div>
  );
}
