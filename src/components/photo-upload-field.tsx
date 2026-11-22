'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import {
  Camera,
  Check,
  CheckCircle2,
  X,
  RotateCcw,
  SwitchCamera,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { PropertyPhotoSlotKey, PropertyPhotoSlots } from '@/lib/types';

export const MAX_PROPERTY_PHOTOS = 6;

export interface PhotoSlotMeta {
  key: PropertyPhotoSlotKey;
  index: number;
  label: string;
  subtitle: string;
  required: boolean;
}

export const PROPERTY_PHOTO_SLOTS: PhotoSlotMeta[] = [
  {
    key: 'front',
    index: 0,
    label: 'Front Photo',
    subtitle: 'Exterior / Main Entrance (Cover)',
    required: true,
  },
  {
    key: 'kitchen',
    index: 1,
    label: 'Kitchen Photo',
    subtitle: 'Clear view of the kitchen',
    required: true,
  },
  {
    key: 'bedroom',
    index: 2,
    label: 'Bedroom Photo',
    subtitle: 'Main bedroom view',
    required: true,
  },
  {
    key: 'extra1',
    index: 3,
    label: 'Additional Photo 1',
    subtitle: 'Optional • Living room / Hall',
    required: false,
  },
  {
    key: 'extra2',
    index: 4,
    label: 'Additional Photo 2',
    subtitle: 'Optional • Bathroom / Balcony',
    required: false,
  },
  {
    key: 'extra3',
    index: 5,
    label: 'Additional Photo 3',
    subtitle: 'Optional • Parking / Other',
    required: false,
  },
];

export function createEmptyPhotoSlots(): PropertyPhotoSlots {
  return {
    front: null,
    kitchen: null,
    bedroom: null,
    extra1: null,
    extra2: null,
    extra3: null,
  };
}

export function createInitialPhotoSlots(existingUrls: string[] = []): PropertyPhotoSlots {
  const slots = createEmptyPhotoSlots();
  const remaining: string[] = [];

  for (const url of existingUrls.slice(0, MAX_PROPERTY_PHOTOS)) {
    const match = url.match(/slot-(\d+)-/i);
    if (match) {
      const idx = Number(match[1]);
      const meta = PROPERTY_PHOTO_SLOTS[idx];
      if (meta && !slots[meta.key]) {
        slots[meta.key] = url;
        continue;
      }
    }
    remaining.push(url);
  }

  for (const url of remaining) {
    const emptySlot = PROPERTY_PHOTO_SLOTS.find((meta) => !slots[meta.key]);
    if (emptySlot) {
      slots[emptySlot.key] = url;
    }
  }

  return slots;
}

interface PhotoUploadFieldProps {
  name: string;
  label: string;
  description?: string;
  onRemoveExistingUrl?: (url: string) => void;
}

export function PhotoUploadField({
  name,
  label,
  description,
  onRemoveExistingUrl,
}: PhotoUploadFieldProps) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const { toast } = useToast();

  const watchedSlots = watch(name) as PropertyPhotoSlots | undefined;
  const slots: PropertyPhotoSlots = React.useMemo(
    () => ({
      ...createEmptyPhotoSlots(),
      ...(watchedSlots ?? {}),
    }),
    [watchedSlots]
  );

  const [filePreviewMap, setFilePreviewMap] = React.useState<
    Partial<Record<PropertyPhotoSlotKey, string>>
  >({});

  // Full-screen camera state
  const [activeSlotKey, setActiveSlotKey] = React.useState<PropertyPhotoSlotKey | null>(null);
  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment');
  const [isStartingCamera, setIsStartingCamera] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [pendingCapture, setPendingCapture] = React.useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const { front, kitchen, bedroom, extra1, extra2, extra3 } = slots;

  // Maintain object URLs for captured File instances in slots
  React.useEffect(() => {
    const slotEntries: [PropertyPhotoSlotKey, File | string | null][] = [
      ['front', front],
      ['kitchen', kitchen],
      ['bedroom', bedroom],
      ['extra1', extra1],
      ['extra2', extra2],
      ['extra3', extra3],
    ];
    const nextMap: Partial<Record<PropertyPhotoSlotKey, string>> = {};
    const createdUrls: string[] = [];

    for (const [key, value] of slotEntries) {
      if (value instanceof File) {
        const url = URL.createObjectURL(value);
        nextMap[key] = url;
        createdUrls.push(url);
      }
    }

    setFilePreviewMap(nextMap);

    return () => {
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [front, kitchen, bedroom, extra1, extra2, extra3]);

  // Clean up pending preview URL if replaced or unmounted
  React.useEffect(() => {
    return () => {
      if (pendingCapture?.previewUrl) {
        URL.revokeObjectURL(pendingCapture.previewUrl);
      }
    };
  }, [pendingCapture]);

  const stopTracks = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const exitBrowserFullscreen = React.useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // Ignore fullscreen exit errors
      });
    }
  }, []);

  const closeCamera = React.useCallback(() => {
    stopTracks();
    exitBrowserFullscreen();
    setPendingCapture(null);
    setCameraError(null);
    setIsStartingCamera(false);
    setActiveSlotKey(null);
  }, [stopTracks, exitBrowserFullscreen]);

  // Stop camera tracks on unmount
  React.useEffect(() => {
    return () => {
      stopTracks();
      exitBrowserFullscreen();
    };
  }, [stopTracks, exitBrowserFullscreen]);

  // Lock page scroll & handle Escape key while full-screen camera is open
  React.useEffect(() => {
    if (!activeSlotKey) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSlotKey, closeCamera]);

  const startStream = React.useCallback(
    async (mode: 'environment' | 'user') => {
      stopTracks();
      setCameraError(null);
      setIsStartingCamera(true);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setIsStartingCamera(false);
        setCameraError(
          'Live camera is not supported in this browser. Please open this page on a device with a camera.'
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (errName === 'OverconstrainedError' || errName === 'NotFoundError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw err;
          }
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // Autoplay handled natively
          });
        }
      } catch (error) {
        const errName = error instanceof DOMException ? error.name : '';
        const isDenied =
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError';
        const isNotFound = errName === 'NotFoundError' || errName === 'DevicesNotFoundError';

        const message = isDenied
          ? 'Camera permission was denied. Please allow camera access in your browser settings and tap Retry.'
          : isNotFound
            ? 'No camera was found on this device. A live camera is required to capture property photos.'
            : 'Unable to access the camera right now. Please close other apps using the camera and try again.';

        setCameraError(message);
        toast({
          variant: 'destructive',
          title: isDenied ? 'Camera Permission Required' : 'Camera Unavailable',
          description: message,
        });
      } finally {
        setIsStartingCamera(false);
      }
    },
    [stopTracks, toast]
  );

  // Attach stream whenever camera opens or pending capture is cleared (retake)
  React.useEffect(() => {
    if (!activeSlotKey || pendingCapture) return;

    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
      return;
    }

    startStream(facingMode);
  }, [activeSlotKey, facingMode, pendingCapture, startStream]);

  // Request native fullscreen on the overlay element if allowed by browser/iframe
  React.useEffect(() => {
    if (!activeSlotKey) return;
    const el = overlayRef.current;
    if (el && typeof el.requestFullscreen === 'function' && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Fallback: fixed inset-0 w-screen h-[100dvh] already fills viewport
      });
    }
  }, [activeSlotKey]);

  const openFullScreenCamera = (slotKey: PropertyPhotoSlotKey) => {
    setPendingCapture(null);
    setCameraError(null);
    setActiveSlotKey(slotKey);
  };

  const handleToggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    stopTracks();
    setFacingMode(nextMode);
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !activeSlotKey) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const slotMeta = PROPERTY_PHOTO_SLOTS.find((s) => s.key === activeSlotKey);
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const prefix = slotMeta ? `slot-${slotMeta.index}-${slotMeta.key}` : activeSlotKey;
        const file = new File([blob], `${prefix}_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        const previewUrl = URL.createObjectURL(file);
        setPendingCapture({ file, previewUrl });
      },
      'image/jpeg',
      0.92
    );
  };

  const saveCapturedPhoto = (advanceToSlotKey: PropertyPhotoSlotKey | null) => {
    if (!activeSlotKey || !pendingCapture) return;

    const previousValue = slots[activeSlotKey];
    if (typeof previousValue === 'string' && onRemoveExistingUrl) {
      onRemoveExistingUrl(previousValue);
    }

    const updatedSlots: PropertyPhotoSlots = {
      ...slots,
      [activeSlotKey]: pendingCapture.file,
    };
    setValue(name, updatedSlots, { shouldValidate: true, shouldDirty: true });

    if (advanceToSlotKey) {
      setPendingCapture(null);
      setActiveSlotKey(advanceToSlotKey);
    } else {
      closeCamera();
    }
  };

  const handleRemoveSlotPhoto = (slotKey: PropertyPhotoSlotKey) => {
    const previousValue = slots[slotKey];
    if (typeof previousValue === 'string' && onRemoveExistingUrl) {
      onRemoveExistingUrl(previousValue);
    }

    const updatedSlots: PropertyPhotoSlots = {
      ...slots,
      [slotKey]: null,
    };
    setValue(name, updatedSlots, { shouldValidate: true, shouldDirty: true });
  };

  const totalCaptured = PROPERTY_PHOTO_SLOTS.filter((meta) => Boolean(slots[meta.key])).length;
  const activeSlotMeta = activeSlotKey
    ? PROPERTY_PHOTO_SLOTS.find((s) => s.key === activeSlotKey) ?? null
    : null;

  // Next missing compulsory slot (for quick back-to-back shooting)
  const nextRequiredSlot = React.useMemo(() => {
    if (!activeSlotKey) return null;
    return (
      PROPERTY_PHOTO_SLOTS.find(
        (meta) => meta.required && meta.key !== activeSlotKey && !slots[meta.key]
      ) ?? null
    );
  }, [activeSlotKey, slots]);

  const fieldError = errors[name] as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const errorMessage = fieldError?.message || fieldError?.root?.message || null;
  const hasError = Boolean(errorMessage);

  const fullScreenCameraOverlay =
    activeSlotKey && activeSlotMeta && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-[100] flex flex-col bg-black text-white w-screen h-[100dvh] select-none"
            role="dialog"
            aria-modal="true"
            aria-label={`Capture ${activeSlotMeta.label}`}
          >
            {/* Top HUD */}
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 bg-gradient-to-b from-black/85 via-black/45 to-transparent">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeCamera}
                  className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-white/20 hover:text-white shrink-0"
                  aria-label="Close camera"
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-semibold text-base sm:text-lg truncate">
                      {activeSlotMeta.label}
                    </span>
                    <Badge
                      variant={activeSlotMeta.required ? 'destructive' : 'secondary'}
                      className="text-[10px] uppercase tracking-wide shrink-0"
                    >
                      {activeSlotMeta.required ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/75 truncate">{activeSlotMeta.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium bg-black/55 border border-white/20 px-2.5 py-1 rounded-full">
                  {totalCaptured} / {MAX_PROPERTY_PHOTOS}
                </span>
                {!pendingCapture && !cameraError && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleCameraFacing}
                    className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-white/20 hover:text-white"
                    aria-label="Switch camera"
                    title="Switch front/back camera"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Full-screen Live Viewfinder / Captured Review */}
            <div className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
              {pendingCapture ? (
                <Image
                  src={pendingCapture.previewUrl}
                  alt={`Captured ${activeSlotMeta.label}`}
                  fill
                  unoptimized
                  className="object-contain bg-black"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* Viewfinder framing corners */}
                  {!cameraError && !isStartingCamera && (
                    <div className="pointer-events-none absolute inset-6 sm:inset-12 md:inset-16">
                      <div className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white/70 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white/70 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white/70 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white/70 rounded-br-md" />
                    </div>
                  )}

                  {isStartingCamera && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-sm text-white/80">Opening live camera...</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90">
                      <div className="max-w-md w-full space-y-4">
                        <Alert
                          variant="destructive"
                          className="bg-background text-foreground border-destructive"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Live Camera Required</AlertTitle>
                          <AlertDescription className="mt-1">{cameraError}</AlertDescription>
                        </Alert>
                        <div className="flex justify-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={closeCamera}
                            className="bg-transparent text-white border-white/30 hover:bg-white/15 hover:text-white"
                          >
                            Close
                          </Button>
                          <Button
                            type="button"
                            onClick={() => startStream(facingMode)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Retry Camera
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom Controls HUD */}
            {!cameraError && (
              <div className="absolute bottom-0 inset-x-0 z-20 px-4 pt-8 pb-8 sm:pb-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
                {pendingCapture ? (
                  <div className="max-w-lg mx-auto flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => setPendingCapture(null)}
                      className="bg-black/60 text-white border-white/30 hover:bg-white/15 hover:text-white"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retake
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => saveCapturedPhoto(null)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Use Photo
                    </Button>
                    {nextRequiredSlot && (
                      <Button
                        type="button"
                        size="lg"
                        onClick={() => saveCapturedPhoto(nextRequiredSlot.key)}
                      >
                        Save &amp; Next: {nextRequiredSlot.label.replace(' Photo', '')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-xs sm:text-sm text-white/80 text-center">
                      Tap the shutter button to capture {activeSlotMeta.label.toLowerCase()}
                    </p>
                    <button
                      type="button"
                      onClick={handleCaptureFrame}
                      disabled={isStartingCamera}
                      aria-label={`Capture ${activeSlotMeta.label}`}
                      className="group relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white bg-white/15 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <span className="w-14 h-14 rounded-full bg-white group-hover:bg-white/90 transition-colors" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className={cn('text-base', hasError && 'text-destructive')}>{label}</Label>
        <Badge
          variant={totalCaptured >= 3 ? 'default' : 'secondary'}
          className="font-semibold"
        >
          {totalCaptured} / {MAX_PROPERTY_PHOTOS} Photos
        </Badge>
      </div>

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {/* Compulsory Photos Checklist */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium">Compulsory:</span>
        {PROPERTY_PHOTO_SLOTS.filter((s) => s.required).map((meta) => {
          const captured = Boolean(slots[meta.key]);
          return (
            <Badge
              key={meta.key}
              variant={captured ? 'default' : 'outline'}
              className={cn(
                'gap-1',
                captured
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-500'
                  : 'border-amber-500/60 text-amber-500'
              )}
            >
              {captured ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              {meta.label.replace(' Photo', '')}
            </Badge>
          );
        })}
      </div>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-lg border-2 border-dashed p-4 transition-colors',
          hasError ? 'border-destructive' : 'border-border'
        )}
      >
        {PROPERTY_PHOTO_SLOTS.map((meta) => {
          const slotValue = slots[meta.key];
          const previewSrc =
            typeof slotValue === 'string'
              ? slotValue
              : slotValue instanceof File
                ? filePreviewMap[meta.key] ?? null
                : null;
          const isLocalFile = slotValue instanceof File;

          return (
            <div
              key={meta.key}
              className={cn(
                'flex flex-col rounded-lg border overflow-hidden bg-card transition-colors',
                previewSrc
                  ? 'border-primary/60'
                  : meta.required
                    ? 'border-amber-500/40'
                    : 'border-border'
              )}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
                <span className="text-sm font-medium truncate">{meta.label}</span>
                <Badge
                  variant={meta.required ? 'destructive' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 shrink-0"
                >
                  {meta.required ? 'Required' : 'Optional'}
                </Badge>
              </div>

              {previewSrc ? (
                <div className="relative aspect-video bg-muted group">
                  <Image
                    src={previewSrc}
                    alt={meta.label}
                    fill
                    unoptimized={isLocalFile}
                    referrerPolicy={isLocalFile ? undefined : 'no-referrer'}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
                    onClick={() => handleRemoveSlotPhoto(meta.key)}
                    aria-label={`Remove ${meta.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 to-transparent flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => openFullScreenCamera(meta.key)}
                    >
                      <Camera className="mr-1.5 h-3.5 w-3.5" />
                      Retake
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openFullScreenCamera(meta.key)}
                  className="aspect-video flex flex-col items-center justify-center gap-2 p-4 text-center hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Take Live Photo</p>
                    <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Live camera capture only (max {MAX_PROPERTY_PHOTOS} photos). Front, Kitchen, and Bedroom
        photos are compulsory. Photos are automatically compressed before upload.
      </p>

      {errorMessage && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}

      {fullScreenCameraOverlay}
    </div>
  );
}
