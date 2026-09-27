import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VoiceRecorder from "./VoiceRecorder.jsx";

class MockMediaRecorder {
  static instances = [];
  static isTypeSupported = vi.fn(
    (mimeType) => mimeType === "audio/webm;codecs=opus",
  );

  constructor(stream, options) {
    this.mimeType = options.mimeType;
    this.options = options;
    this.state = "inactive";
    this.stream = stream;
    MockMediaRecorder.instances.push(this);
  }

  start(timeslice) {
    this.state = "recording";
    this.timeslice = timeslice;
  }

  stop() {
    this.state = "inactive";
  }

  finish(blob = new Blob(["voice"], { type: this.mimeType })) {
    this.ondataavailable?.({ data: blob });
    this.onstop?.();
  }
}

function createStream() {
  const stop = vi.fn();
  return {
    getTracks: () => [{ stop }],
    stop,
  };
}

describe("VoiceRecorder", () => {
  let createObjectURL;
  let getUserMedia;
  let mediaDevicesDescriptor;
  let revokeObjectURL;

  beforeEach(() => {
    MockMediaRecorder.instances = [];
    MockMediaRecorder.isTypeSupported
      .mockReset()
      .mockImplementation((mimeType) => mimeType === "audio/webm;codecs=opus");
    createObjectURL = vi.fn(() => "blob:recording-1");
    revokeObjectURL = vi.fn();
    getUserMedia = vi.fn();
    mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      "mediaDevices",
    );
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (mediaDevicesDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        "mediaDevices",
        mediaDevicesDescriptor,
      );
    } else {
      delete globalThis.navigator.mediaDevices;
    }
  });

  it.each([
    {
      errorName: "NotAllowedError",
      expectedMessage: "Microphone access was denied",
      scenario: "permission denial",
    },
    {
      errorName: "NotFoundError",
      expectedMessage: "No microphone was found",
      scenario: "absent hardware",
    },
    {
      errorName: "NotReadableError",
      expectedMessage: "Your microphone is unavailable or in use elsewhere",
      scenario: "unavailable hardware",
    },
  ])(
    "requests permission only after explicit start and maps $scenario",
    async ({ errorName, expectedMessage }) => {
      const permissionError = new Error("browser detail");
      permissionError.name = errorName;
      getUserMedia.mockRejectedValueOnce(permissionError);
      const onUseText = vi.fn();
      render(<VoiceRecorder onUseText={onUseText} />);

      expect(getUserMedia).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Start recording" }));

      expect(getUserMedia).toHaveBeenCalledWith({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      expect(
        await screen.findByText(new RegExp(expectedMessage)),
      ).toBeVisible();
      expect(screen.queryByText("browser detail")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
      expect(onUseText).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects unsupported capture and retains typed fallback", () => {
    MockMediaRecorder.isTypeSupported.mockReturnValue(false);
    const onUseText = vi.fn();
    render(<VoiceRecorder onUseText={onUseText} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));

    expect(
      screen.getByText(/Voice recording is not supported by this browser/),
    ).toBeVisible();
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Type instead" }));
    expect(onUseText).toHaveBeenCalledTimes(1);
  });

  it("records, shows processing, creates a local preview, and stops tracks", async () => {
    const stream = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    render(<VoiceRecorder onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(await screen.findByText("Recording")).toBeVisible();
    expect(screen.getByRole("timer")).toHaveTextContent("00:00 / 02:00");

    const mediaRecorder = MockMediaRecorder.instances[0];
    expect(mediaRecorder.options).toEqual({
      mimeType: "audio/webm;codecs=opus",
    });
    expect(mediaRecorder.timeslice).toBe(250);

    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(screen.getByText("Preparing your recording...")).toBeVisible();
    mediaRecorder.finish();

    expect(
      await screen.findByText("Recording ready on this device"),
    ).toBeVisible();
    expect(screen.getByLabelText("Recorded answer preview")).toHaveAttribute(
      "src",
      "blob:recording-1",
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(stream.stop).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
    expect(
      screen.getByRole("button", { name: "Start recording" }),
    ).toBeVisible();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:recording-1");
  });

  it("submits once, shows the saved transcript, and reuses the recording key on retry", async () => {
    const stream = createStream();
    const onTranscribe = vi
      .fn()
      .mockRejectedValueOnce(new Error("Transcription unavailable."))
      .mockResolvedValueOnce("Use a stack for last-in, first-out access.");
    getUserMedia.mockResolvedValueOnce(stream);
    render(<VoiceRecorder onTranscribe={onTranscribe} onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByText("Recording");
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    MockMediaRecorder.instances[0].finish();
    await screen.findByText("Recording ready on this device");

    fireEvent.click(
      screen.getByRole("button", { name: "Submit voice answer" }),
    );
    expect(await screen.findByText("Transcription unavailable.")).toBeVisible();
    const firstRecording = onTranscribe.mock.calls[0][0];

    fireEvent.click(screen.getByRole("button", { name: "Retry voice answer" }));
    expect(
      await screen.findByText("Use a stack for last-in, first-out access."),
    ).toBeVisible();
    expect(onTranscribe).toHaveBeenCalledTimes(2);
    expect(onTranscribe.mock.calls[1][0].idempotencyKey).toBe(
      firstRecording.idempotencyKey,
    );
  });

  it("maps an interrupted recording to safe recovery and stops tracks", async () => {
    const stream = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    render(<VoiceRecorder onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByText("Recording");
    act(() => {
      MockMediaRecorder.instances[0].onerror();
    });

    expect(
      screen.getByText(/Recording was interrupted.*type your answer instead/),
    ).toBeVisible();
    expect(stream.stop).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Retry microphone" }),
    ).toBeVisible();
  });

  it("replaces and revokes a prior recording before re-recording", async () => {
    const firstStream = createStream();
    const secondStream = createStream();
    getUserMedia
      .mockResolvedValueOnce(firstStream)
      .mockResolvedValueOnce(secondStream);
    render(<VoiceRecorder onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByText("Recording");
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    MockMediaRecorder.instances[0].finish();
    await screen.findByText("Recording ready on this device");

    fireEvent.click(screen.getByRole("button", { name: "Record again" }));

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:recording-1");
    expect(await screen.findByText("Recording")).toBeVisible();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("stops active recording resources on unmount", async () => {
    const stream = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    const { unmount } = render(<VoiceRecorder onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await screen.findByText("Recording");
    const mediaRecorder = MockMediaRecorder.instances[0];

    unmount();

    expect(mediaRecorder.state).toBe("inactive");
    expect(stream.stop).toHaveBeenCalledTimes(1);
  });

  it("auto-stops at the 120-second client bound", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T00:00:00.000Z"));
    const stream = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    render(<VoiceRecorder onUseText={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(MockMediaRecorder.instances).toHaveLength(1);
    const mediaRecorder = MockMediaRecorder.instances[0];

    act(() => {
      vi.setSystemTime(new Date("2026-09-23T00:02:00.000Z"));
      vi.advanceTimersByTime(1000);
    });

    expect(mediaRecorder.state).toBe("inactive");
    expect(screen.getByText("Preparing your recording...")).toBeVisible();
  });
});
