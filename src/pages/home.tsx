import { Button, Checkbox, Select, Textarea } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

const Home = () => {
  const [base64Input, setBase64Input] = useState('');
  const [audioFormat, setAudioFormat] = useState<string | null>('wav');
  const [isPcmData, setIsPcmData] = useState(false);
  const [audioPlayerSrc, setAudioPlayerSrc] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(true);

  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  // Effect to revoke object URL when component unmounts or src changes
  useEffect(() => {
    const currentSrc = audioPlayerSrc;
    return () => {
      if (currentSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(currentSrc);
      }
    };
  }, [audioPlayerSrc]);

  // Reset download button when inputs change
  // biome-ignore lint/correctness/useExhaustiveDependencies: YOLO
  useEffect(() => {
    setIsDownloadDisabled(true);
  }, [base64Input, audioFormat, isPcmData]);

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    let cleanBase64 = base64.trim();
    if (cleanBase64.includes(';base64,')) {
      cleanBase64 = cleanBase64.split(';base64,')[1];
    }
    const binaryString = window.atob(cleanBase64);
    const length = binaryString.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  };

  const base64ToBlob = (base64: string, type: string): Blob => {
    const byteCharacters = window.atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type });
    return blob;
  };

  const createWAVHeader = (
    sampleRate: number,
    numChannels: number,
    bitsPerSample: number,
    dataLength: number
  ): ArrayBuffer => {
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    return buffer;
  };

  const createWAVBlob = (
    pcmData: ArrayBuffer,
    sampleRate: number,
    numChannels: number,
    bitsPerSample: number
  ): Blob => {
    const wavHeader = createWAVHeader(sampleRate, numChannels, bitsPerSample, pcmData.byteLength);
    const wavBuffer = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
    wavBuffer.set(new Uint8Array(wavHeader), 0);
    wavBuffer.set(new Uint8Array(pcmData), wavHeader.byteLength);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return blob;
  };

  const handleConvertAndPlay = async () => {
    setErrorMessage('');
    setIsDownloadDisabled(true); // Disable download until audio is loaded

    if (!base64Input.trim()) {
      console.warn('handleConvertAndPlay: Base64 input is empty');
      setErrorMessage('Please enter a base64 string');
      return;
    }

    try {
      if (isPcmData) {
        const pcmData = base64ToArrayBuffer(base64Input);
        const wavBlob = createWAVBlob(pcmData, 24000, 1, 16);
        const audioURL = URL.createObjectURL(wavBlob);
        setAudioPlayerSrc(audioURL);
      } else {
        let cleanBase64 = base64Input.trim();
        if (cleanBase64.includes(';base64,')) {
          cleanBase64 = cleanBase64.split(';base64,')[1];
        }
        const audioDataUrl = `data:audio/${audioFormat};base64,${cleanBase64}`;
        setAudioPlayerSrc(audioDataUrl);
      }
    } catch (err: unknown) {
      console.error('handleConvertAndPlay: Error processing base64:', err);
      if (err instanceof Error) {
        setErrorMessage(`Error processing base64: ${err.message}`);
      } else {
        setErrorMessage('An unknown error occurred while processing base64.');
      }
      setAudioPlayerSrc(undefined); // Clear src on error
    }
  };

  const handleAudioLoaded = () => {
    setIsDownloadDisabled(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.play().catch((err: unknown) => {
        console.error('handleAudioLoaded: Error playing audio:', err);
        if (err instanceof Error) {
          setErrorMessage(`Error playing audio: ${err.message}`);
        } else {
          setErrorMessage('An unknown error occurred while playing audio.');
        }
      });
    }
  };

  const handleAudioError = () => {
    console.error('handleAudioError: Error loading audio in <audio> element.');
    if (!isPcmData && audioPlayerSrc && audioPlayerSrc.startsWith('data:')) {
      try {
        let cleanBase64 = base64Input.trim();
        if (cleanBase64.includes(';base64,')) {
          cleanBase64 = cleanBase64.split(';base64,')[1];
        }
        const blob = base64ToBlob(cleanBase64, `audio/${audioFormat}`);
        const blobUrl = URL.createObjectURL(blob);
        setAudioPlayerSrc(blobUrl);
        setErrorMessage('Error loading audio. Trying fallback...');
        return;
      } catch (err: unknown) {
        console.error('handleAudioError: Blob fallback also failed:', err);
        if (err instanceof Error) {
          setErrorMessage(`Error loading audio. Blob fallback also failed: ${err.message}`);
        } else {
          setErrorMessage('An unknown error occurred during blob fallback.');
        }
        setAudioPlayerSrc(undefined);
        return;
      }
    }
    let specificErrorMessage = 'Unknown error';
    if (audioPlayerRef.current?.error?.message) {
      specificErrorMessage = audioPlayerRef.current.error.message;
    }
    setErrorMessage(`Error loading audio: ${specificErrorMessage}`);
    setAudioPlayerSrc(undefined);
    setIsDownloadDisabled(true);
  };

  const handleDownload = () => {
    let fileExtension = audioFormat || 'wav';
    if (isPcmData) {
      fileExtension = 'wav';
    }

    let downloadUrlToUse: string | null = null;
    let tempBlobUrlCreatedByDownload: string | null = null; // Specifically for URLs created and managed by this function

    try {
      if (base64Input.trim()) {
        let currentBase64 = base64Input.trim();
        if (currentBase64.includes(';base64,')) {
          currentBase64 = currentBase64.split(';base64,')[1];
        }
        const mimeType = isPcmData ? 'audio/wav' : `audio/${fileExtension}`;
        const newBlob = base64ToBlob(currentBase64, mimeType);

        if (newBlob.size === 0) {
          setErrorMessage('Error: Generated file for download is empty.');
          console.error(
            `[${performance.now().toFixed(2)}ms] handleDownload: New blob from base64Input is empty.`
          );
          return;
        }
        tempBlobUrlCreatedByDownload = URL.createObjectURL(newBlob);
        downloadUrlToUse = tempBlobUrlCreatedByDownload;
      } else if (audioPlayerSrc?.startsWith('blob:')) {
        downloadUrlToUse = audioPlayerSrc;
        // This blob's lifecycle is managed by useEffect for audioPlayerSrc, not by this download function.
      } else {
        console.error(
          `[${performance.now().toFixed(2)}ms] handleDownload: Cannot download. No base64Input and audioPlayerSrc is not a usable blob URL.`
        );
        setErrorMessage(
          'No data available to download. Try converting first or provide base64 input.'
        );
        return;
      }

      if (!downloadUrlToUse) {
        console.error(
          `[${performance.now().toFixed(2)}ms] handleDownload: downloadUrlToUse is null after logic. This shouldn't happen.`
        );
        setErrorMessage('Internal error: Could not determine URL for download.');
        return;
      }

      const a = document.createElement('a');
      a.href = downloadUrlToUse;
      a.download = `audio.${fileExtension}`;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      if (tempBlobUrlCreatedByDownload) {
        const urlToRevoke = tempBlobUrlCreatedByDownload;

        setTimeout(() => {
          URL.revokeObjectURL(urlToRevoke);
        }, 150); // Slightly longer delay just in case
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(`Download error: ${error.message}`);
      } else {
        setErrorMessage('An unknown error occurred during download.');
      }
    }
  };

  return (
    <div className="container mx-auto mt-8 flex w-fit flex-col gap-4 px-4">
      <h1 className="font-bold text-2xl">Base64 to Audio Converter</h1>

      <Textarea
        label="Paste Base64 encoded audio string"
        id="base64Input"
        placeholder="Base64 encoded audio string"
        value={base64Input}
        onChange={(e) => setBase64Input(e.target.value)}
        withAsterisk
      />

      <Select
        label="Select audio format:"
        id="audioFormat"
        value={audioFormat}
        data={[
          { value: 'wav', label: 'WAV' },
          { value: 'mp3', label: 'MP3' },
          { value: 'ogg', label: 'OGG' },
          { value: 'mpeg', label: 'MPEG' },
        ]}
        onChange={setAudioFormat}
      />

      <Checkbox
        label="This is raw PCM data"
        id="isPcmData"
        checked={isPcmData}
        onChange={(e) => setIsPcmData(e.target.checked)}
      />
      <Button id="convertButton" onClick={handleConvertAndPlay}>
        Convert and Play
      </Button>

      <div>
        {/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
        <audio
          id="audioPlayer"
          ref={audioPlayerRef}
          src={audioPlayerSrc}
          onLoadedData={handleAudioLoaded}
          onError={handleAudioError}
          controls
        />
      </div>

      {errorMessage && <p className="text-red-500">{errorMessage}</p>}

      {!isDownloadDisabled && (
        <Button variant="outline" onClick={handleDownload} disabled={isDownloadDisabled}>
          Download Audio
        </Button>
      )}
    </div>
  );
};

export default Home;
