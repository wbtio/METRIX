"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations, type Language } from "@/lib/translations";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  language?: Language;
  className?: string;
  /** Smaller control for toolbars and dialogs */
  size?: "default" | "sm";
  /** In corner overlays, stack status lines above the button so they grow into the field */
  statusAboveButton?: boolean;
}

export default function VoiceRecorder({
  onTranscript,
  language = "ar",
  className,
  size = "default",
  statusAboveButton = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = translations[language];

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
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const copy = translations[language];

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType,
          });

          // Send to transcription API
          const formData = new FormData();
          formData.append(
            "audio",
            audioBlob,
            `recording.${mimeType.split("/")[1]}`,
          );
          formData.append("language", language);

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          console.log("Transcribe API response:", response.status, data);

          if (!response.ok || data.fallback) {
            console.warn("Mistral transcription failed:", data);
            setError(copy.voiceTranscribeFailed);
          } else if (data.text) {
            onTranscript(data.text);
          } else {
            setError(copy.voiceNoSpeechDetected);
          }
        } catch (err: unknown) {
          console.error("Transcription error:", err);
          setError(copy.voiceTranscribeError);
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: unknown) {
      console.error("Recording error:", err);
      setError(translations[language].voiceMicAccessError);
      setIsRecording(false);
    }
  }, [language, onTranscript]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

  const iconClass = size === "sm" ? "size-5" : "size-6";
  const btnPad = size === "sm" ? "p-3" : "p-4";
  const statusClass =
    size === "sm"
      ? "max-w-[12rem] text-center text-[11px] leading-snug font-medium"
      : "max-w-[200px] text-center text-xs font-medium";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 sm:gap-2",
        statusAboveButton && "flex-col-reverse",
        size === "sm" && "gap-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleRecording}
        disabled={isProcessing}
        className={cn(
          "relative rounded-full transition-all duration-300",
          btnPad,
          isRecording
            ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          isProcessing && "cursor-not-allowed opacity-50",
        )}
        title={isRecording ? t.voiceMicStopAria : t.voiceMicStartAria}
        aria-label={isRecording ? t.voiceMicStopAria : t.voiceMicStartAria}
      >
        {isProcessing ? (
          <Loader2 className={cn("animate-spin", iconClass)} />
        ) : isRecording ? (
          <MicOff className={iconClass} />
        ) : (
          <Mic className={iconClass} />
        )}

        {isRecording && (
          <span className="absolute -top-1 end-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {error && (
        <p className={cn("text-destructive", statusClass)} role="status">
          {error}
        </p>
      )}

      {isRecording && (
        <p
          className={cn(
            "animate-pulse text-muted-foreground",
            size === "sm" ? "text-[11px]" : "text-xs",
          )}
          role="status"
        >
          {t.voiceRecordingLabel}
        </p>
      )}

      {isProcessing && (
        <p
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-[11px]" : "text-xs",
          )}
          role="status"
        >
          {t.voiceProcessingLabel}
        </p>
      )}
    </div>
  );
}
