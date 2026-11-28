'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function getPhotoLabelFromUrl(url: string, index: number): string {
  if (/slot-0-front/i.test(url)) return 'Front Photo';
  if (/slot-1-kitchen/i.test(url)) return 'Kitchen Photo';
  if (/slot-2-bedroom/i.test(url)) return 'Bedroom Photo';
  if (/slot-3-extra1/i.test(url)) return 'Additional Photo 1';
  if (/slot-4-extra2/i.test(url)) return 'Additional Photo 2';
  if (/slot-5-extra3/i.test(url)) return 'Additional Photo 3';
  return `Photo ${index + 1}`;
}

interface ImageLightboxProps {
  images: string[];
  title: string;
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export function ImageLightbox({
  images,
  title,
  initialIndex = 0,
  open,
  onClose,
}: ImageLightboxProps) {
  const validImages = React.useMemo(
    () => images.filter((url) => Boolean(url && url.trim())),
    [images]
  );

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = React.useState(false);

  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const dragStartRef = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);

  // Sync index & reset zoom whenever lightbox opens
  React.useEffect(() => {
    if (open) {
      const safeIndex = Math.max(0, Math.min(initialIndex, Math.max(0, validImages.length - 1)));
      setCurrentIndex(safeIndex);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, initialIndex, validImages.length]);

  const resetZoom = React.useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = React.useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [validImages.length]);

  const goNext = React.useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [validImages.length]);

  const handleZoomIn = React.useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomOut = React.useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2)));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleClose = React.useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  const toggleNativeFullscreen = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (overlayRef.current?.requestFullscreen) {
      overlayRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  // Track browser fullscreen state
  React.useEffect(() => {
    if (!open) return;
    const onFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [open]);

  // Lock body scroll & bind keyboard controls while open
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, handleClose, goPrev, goNext, handleZoomIn, handleZoomOut, resetZoom]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.ox + dx,
      y: dragStartRef.current.oy + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoom > 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (zoom > 1 || !touchStartRef.current || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (dt < 600 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      if (e.deltaY < 0) {
        handleZoomIn();
      } else if (e.deltaY > 0) {
        handleZoomOut();
      }
    }
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2);
    }
  };

  if (!open || validImages.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const currentUrl = validImages[currentIndex] || validImages[0];
  const photoLabel = getPhotoLabelFromUrl(currentUrl, currentIndex);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white w-screen h-[100dvh] select-none backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} full-size photo viewer`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent z-20 shrink-0">
        <div className="min-w-0 flex items-center gap-3">
          <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white shrink-0">
            {currentIndex + 1} / {validImages.length}
          </span>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold truncate">{photoLabel}</p>
            <p className="text-xs text-white/70 truncate">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-40"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="hidden sm:inline-block text-xs font-medium w-11 text-center text-white/85">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-40"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {zoom > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
              aria-label="Reset zoom"
              title="Reset zoom (0)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleNativeFullscreen}
            className="hidden sm:inline-flex h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
            aria-label={isNativeFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isNativeFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isNativeFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white ml-1"
            aria-label="Close full-size viewer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Full-Size Image Stage */}
      <div
        className={cn(
          'relative flex-1 w-full overflow-hidden flex items-center justify-center',
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          if (e.target === e.currentTarget && zoom <= 1) {
            handleClose();
          }
        }}
      >
        <div
          className={cn(
            'relative w-full h-full max-w-[96vw] max-h-full',
            !isDragging && 'transition-transform duration-150 ease-out'
          )}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
          }}
        >
          <Image
            src={currentUrl}
            alt={`${title} - ${photoLabel}`}
            fill
            sizes="100vw"
            referrerPolicy="no-referrer"
            className="object-contain pointer-events-none"
            priority
          />
        </div>

        {/* Previous / Next Navigation Arrows */}
        {validImages.length > 1 && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/55 border border-white/20 text-white hover:bg-black/80 hover:text-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-black/55 border border-white/20 text-white hover:bg-black/80 hover:text-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="px-4 py-3 bg-gradient-to-t from-black/90 to-transparent z-20 shrink-0">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
            {validImages.map((url, index) => (
              <button
                key={`lightbox-thumb-${url}-${index}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                  resetZoom();
                }}
                aria-label={`View ${getPhotoLabelFromUrl(url, index)}`}
                className={cn(
                  'relative h-14 w-20 sm:h-16 sm:w-24 rounded-md overflow-hidden shrink-0 transition-all border-2',
                  index === currentIndex
                    ? 'border-primary ring-2 ring-primary/60 opacity-100 scale-105'
                    : 'border-transparent opacity-55 hover:opacity-90'
                )}
              >
                <Image
                  src={url}
                  alt={getPhotoLabelFromUrl(url, index)}
                  fill
                  sizes="96px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
