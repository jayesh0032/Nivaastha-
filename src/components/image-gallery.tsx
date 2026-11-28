'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageLightbox, getPhotoLabelFromUrl } from '@/components/image-lightbox';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const validImages = React.useMemo(
    () => images.filter((url) => Boolean(url && url.trim())),
    [images]
  );

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [validImages]);

  if (validImages.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video relative bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">No images available</p>
        </div>
      </Card>
    );
  }

  const safeIndex = Math.min(selectedIndex, validImages.length - 1);
  const selectedImage = validImages[safeIndex];
  const currentLabel = getPhotoLabelFromUrl(selectedImage, safeIndex);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % validImages.length);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsLightboxOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsLightboxOpen(true);
            }
          }}
          aria-label={`Open ${currentLabel} in full size`}
          className="aspect-video relative bg-muted group cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src={selectedImage}
            alt={`${title} - ${currentLabel}`}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            referrerPolicy="no-referrer"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 opacity-80 group-hover:opacity-100 transition-opacity" />

          {/* Photo Label & Counter */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <Badge
              variant="secondary"
              className="bg-black/65 text-white border-white/15 backdrop-blur-sm"
            >
              {currentLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-black/65 text-white border-white/15 backdrop-blur-sm"
            >
              {safeIndex + 1} / {validImages.length}
            </Badge>
          </div>

          {/* Prev / Next quick navigation */}
          {validImages.length > 1 && (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={handlePrev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={handleNext}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* View Full Size CTA */}
          <div className="absolute bottom-3 right-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-sm"
            >
              <Expand className="mr-1.5 h-4 w-4" />
              View Full Size
            </Button>
          </div>
        </div>
      </Card>

      {validImages.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {validImages.map((url, index) => {
            const label = getPhotoLabelFromUrl(url, index);
            const isActive = index === safeIndex;
            return (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => {
                  if (isActive) {
                    setIsLightboxOpen(true);
                  } else {
                    setSelectedIndex(index);
                  }
                }}
                title={`${label} (click again to open full size)`}
                className={cn(
                  'overflow-hidden rounded-md aspect-video relative transition-all duration-200 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'ring-2 ring-primary opacity-100'
                    : 'opacity-70 hover:opacity-100'
                )}
              >
                <Image
                  src={url}
                  alt={`${title} - ${label}`}
                  fill
                  referrerPolicy="no-referrer"
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 15vw"
                />
              </button>
            );
          })}
        </div>
      )}

      <ImageLightbox
        images={validImages}
        title={title}
        initialIndex={safeIndex}
        open={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}