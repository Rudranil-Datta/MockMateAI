import { Loader2, Mic, RotateCcw, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Button from "../common/Button.jsx";
import InlineAlert from "../common/InlineAlert.jsx";

const maxRecordingSeconds = 120;
const supportedMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedMimeType() {
  if (
    typeof globalThis.MediaRecorder !== "function" ||
    typeof globalThis.MediaRecorder.isTypeSupported !== "function" ||
    typeof globalThis.navigator?.mediaDevices?.getUserMedia !== "function"
  ) {
    return "";
  }

  return (
    supportedMimeTypes.find((mimeType) =>
      globalThis.MediaRecorder.isTypeSupported(mimeType),
    ) || ""
  );
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getCaptureErrorMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Microphone access was denied. Allow access in your browser settings or type your answer instead.";
  }

  if (error?.name === "NotFoundError") {
    return "No microphone was found. Connect a microphone or type your answer instead.";
  }

  if (error?.name === "NotReadableError") {
    return "Your microphone is unavailable or in use elsewhere. Close other recording apps and retry, or type instead.";
  }

  return "Recording could not start. Check your microphone and retry, or type your answer instead.";
}

function VoiceRecorder({ disabled = false, onTranscribe, onUseText }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [recording, setRecording] = useState(null);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const chunksRef = useRef([]);
  const isMountedRef = useRef(true);
  const mediaRecorderRef = useRef(null);
  const previewUrlRef = useRef("");
  const startedAtRef = useRef(0);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptionControllerRef = useRef(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      globalThis.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopTracks(stream = streamRef.current) {
    stream?.getTracks().forEach((track) => track.stop());
    if (stream === streamRef.current) {
      streamRef.current = null;
    }
  }

  function revokePreview() {
    if (previewUrlRef.current) {
      globalThis.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }

  function discardRecording() {
    transcriptionControllerRef.current?.abort();
    transcriptionControllerRef.current = null;
    revokePreview();
    setRecording(null);
    setElapsedSeconds(0);
    setErrorMessage("");
    setTranscript("");
    setStatus("idle");
  }

  function finishWithError(message) {
    clearTimer();
    stopTracks();
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (isMountedRef.current) {
      setErrorMessage(message);
      setStatus("error");
    }
  }

  async function startRecording() {
    if (
      disabled ||
      status === "requesting" ||
      status === "recording" ||
      status === "processing"
    ) {
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setErrorMessage(
        "Voice recording is not supported by this browser. Type your answer instead.",
      );
      setStatus("error");
      return;
    }

    revokePreview();
    transcriptionControllerRef.current?.abort();
    transcriptionControllerRef.current = null;
    setRecording(null);
    setElapsedSeconds(0);
    setErrorMessage("");
    setTranscript("");
    setStatus("requesting");

    let stream;

    try {
      stream = await globalThis.navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (!isMountedRef.current) {
        stopTracks(stream);
        return;
      }

      const mediaRecorder = new globalThis.MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = null;
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
        finishWithError(
          "Recording was interrupted. Retry, or type your answer instead.",
        );
      };

      mediaRecorder.onstop = () => {
        clearTimer();
        stopTracks(stream);
        mediaRecorderRef.current = null;

        if (!isMountedRef.current) {
          chunksRef.current = [];
          return;
        }

        if (chunksRef.current.length === 0) {
          finishWithError(
            "No audio was captured. Check your microphone and retry, or type instead.",
          );
          return;
        }

        const durationSeconds = Math.min(
          maxRecordingSeconds,
          Math.max(1, Math.ceil((Date.now() - startedAtRef.current) / 1000)),
        );
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || mimeType,
        });
        const previewUrl = globalThis.URL.createObjectURL(blob);
        chunksRef.current = [];
        previewUrlRef.current = previewUrl;
        setElapsedSeconds(durationSeconds);
        setRecording({
          blob,
          durationSeconds,
          idempotencyKey: globalThis.crypto.randomUUID(),
          mimeType: blob.type,
          previewUrl,
        });
        setStatus("ready");
      };

      startedAtRef.current = Date.now();
      mediaRecorder.start(250);
      setStatus("recording");
      timerRef.current = globalThis.setInterval(() => {
        const nextElapsed = Math.min(
          maxRecordingSeconds,
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        );
        setElapsedSeconds(nextElapsed);

        if (
          nextElapsed >= maxRecordingSeconds &&
          mediaRecorder.state === "recording"
        ) {
          clearTimer();
          setStatus("processing");
          mediaRecorder.stop();
        }
      }, 1000);
    } catch (error) {
      stopTracks(stream);
      finishWithError(getCaptureErrorMessage(error));
    }
  }

  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current;
    if (status !== "recording" || mediaRecorder?.state !== "recording") {
      return;
    }

    clearTimer();
    setStatus("processing");
    mediaRecorder.stop();
  }

  async function transcribeRecording() {
    if (!recording || typeof onTranscribe !== "function") {
      return;
    }

    const controller = new AbortController();
    transcriptionControllerRef.current?.abort();
    transcriptionControllerRef.current = controller;
    setErrorMessage("");
    setStatus("transcribing");

    try {
      const text = await onTranscribe(recording, controller.signal);

      if (!controller.signal.aborted && isMountedRef.current) {
        setTranscript(text);
        setStatus("transcribed");
      }
    } catch (error) {
      if (!controller.signal.aborted && isMountedRef.current) {
        setErrorMessage(
          error?.code === "AI_QUOTA_EXCEEDED"
            ? ""
            : error?.message ||
                "Voice transcription failed. Retry or type your answer instead.",
        );
        setStatus("transcription-error");
      }
    } finally {
      if (transcriptionControllerRef.current === controller) {
        transcriptionControllerRef.current = null;
      }
    }
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      transcriptionControllerRef.current?.abort();
      clearTimer();
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder) {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onerror = null;
        mediaRecorder.onstop = null;
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }
      stopTracks();
      revokePreview();
    };
  }, []);

  const isBusy =
    status === "requesting" ||
    status === "processing" ||
    status === "transcribing";

  return (
    <section
      aria-labelledby="voice-recorder-heading"
      className="voice-recorder"
    >
      <div className="voice-recorder-heading">
        <div>
          <h2 id="voice-recorder-heading">Record your answer</h2>
          <p>
            Record up to 2 minutes. Audio stays on this device until you choose
            to upload it for transcription.
          </p>
        </div>
        <Button
          className="button--secondary"
          disabled={disabled || isBusy}
          onClick={onUseText}
        >
          Type instead
        </Button>
      </div>

      {status === "idle" ? (
        <div className="voice-recorder-actions">
          <Button disabled={disabled} onClick={startRecording}>
            <Mic aria-hidden="true" size={18} />
            Start recording
          </Button>
          <p>Microphone access is requested only after you start.</p>
        </div>
      ) : null}

      {status === "requesting" ? (
        <InlineAlert>
          <span aria-live="polite" className="alert-row">
            <Loader2 aria-hidden="true" size={18} />
            Waiting for microphone permission...
          </span>
        </InlineAlert>
      ) : null}

      {status === "recording" ? (
        <div className="voice-recording-state">
          <div>
            <p className="voice-status">
              <span aria-hidden="true" className="recording-dot" />
              Recording
            </p>
            <p aria-live="off" className="recording-timer" role="timer">
              {formatDuration(elapsedSeconds)} / 02:00
            </p>
          </div>
          <Button disabled={disabled} onClick={stopRecording}>
            <Square aria-hidden="true" size={17} />
            Stop recording
          </Button>
        </div>
      ) : null}

      {status === "processing" ? (
        <InlineAlert>
          <span aria-live="polite" className="alert-row">
            <Loader2 aria-hidden="true" size={18} />
            Preparing your recording...
          </span>
        </InlineAlert>
      ) : null}

      {status === "ready" && recording ? (
        <div className="voice-recording-ready">
          <div>
            <p className="voice-status">Recording ready on this device</p>
            <p>
              {formatDuration(recording.durationSeconds)} · {recording.mimeType}
            </p>
          </div>
          <audio
            aria-label="Recorded answer preview"
            controls
            src={recording.previewUrl}
          />
          <InlineAlert>
            Recording is ready. Submit it for transcription and feedback,
            re-record, or type your answer instead.
          </InlineAlert>
          <div className="voice-recorder-actions">
            <Button disabled={disabled} onClick={transcribeRecording}>
              Submit voice answer
            </Button>
            <Button disabled={disabled} onClick={startRecording}>
              <RotateCcw aria-hidden="true" size={17} />
              Record again
            </Button>
            <Button
              className="button--secondary"
              disabled={disabled}
              onClick={discardRecording}
            >
              <Trash2 aria-hidden="true" size={17} />
              Discard recording
            </Button>
          </div>
        </div>
      ) : null}

      {status === "transcribing" ? (
        <div className="voice-recording-ready">
          <audio
            aria-label="Recorded answer preview"
            controls
            src={recording.previewUrl}
          />
          <InlineAlert>
            <span aria-live="polite" className="alert-row">
              <Loader2 aria-hidden="true" size={18} />
              Transcribing, saving, and evaluating your answer...
            </span>
          </InlineAlert>
        </div>
      ) : null}

      {status === "transcribed" ? (
        <div className="voice-recording-ready">
          <InlineAlert>
            <span aria-live="polite">
              Voice answer saved. Feedback is ready below.
            </span>
          </InlineAlert>
          <div className="voice-transcript">
            <h3>Your transcript</h3>
            <p>{transcript}</p>
          </div>
          <div className="voice-recorder-actions">
            <Button disabled={disabled} onClick={startRecording}>
              <RotateCcw aria-hidden="true" size={17} />
              Record again
            </Button>
          </div>
        </div>
      ) : null}

      {status === "transcription-error" ? (
        <div className="voice-recorder-error">
          {errorMessage ? (
            <InlineAlert tone="error">{errorMessage}</InlineAlert>
          ) : null}
          <div className="voice-recorder-actions">
            <Button disabled={disabled} onClick={transcribeRecording}>
              Retry voice answer
            </Button>
            <Button
              className="button--secondary"
              disabled={disabled}
              onClick={startRecording}
            >
              Record again
            </Button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="voice-recorder-error">
          <InlineAlert tone="error">{errorMessage}</InlineAlert>
          <div className="voice-recorder-actions">
            {getSupportedMimeType() ? (
              <Button disabled={disabled} onClick={startRecording}>
                Retry microphone
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default VoiceRecorder;
