'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const validImages = React.useMemo(
    () => images.filter((url) => Boolean(url && url.trim())),
    [images]
  );
  const [selectedImage, setSelectedImage] = React.useState<string | null>(
    validImages[0] || null
  );

  React.useEffect(() => {
    setSelectedImage(validImages[0] || null);
  }, [validImages]);

  if (!selectedImage || validImages.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video relative bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">No images available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="aspect-video relative bg-muted">
          <Image
            src={selectedImage}
            alt={title}
            fill
            referrerPolicy="no-referrer"
            className="object-cover transition-all duration-200"
            priority
          />
        </div>
      </Card>
      {validImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
          {validImages.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setSelectedImage(url)}
              className={cn(
                'overflow-hidden rounded-md aspect-square relative transition-all duration-200 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                selectedImage === url
                  ? 'ring-2 ring-primary scale-105'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              )}
            >
              <Image
                src={url}
                alt={`${title} photo ${index + 1}`}
                fill
                referrerPolicy="no-referrer"
                className="object-cover"
                sizes="(max-width: 768px) 20vw, 10vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}