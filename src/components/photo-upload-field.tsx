'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import Image from 'next/image';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PhotoUploadFieldProps {
  name: string;
  label: string;
  description: string;
  multiple?: boolean;
  existingUrls?: string[];
  onRemoveExistingUrl?: (url: string) => void;
}

export function PhotoUploadField({
  name,
  label,
  description,
  multiple = true,
  existingUrls = [],
  onRemoveExistingUrl,
}: PhotoUploadFieldProps) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();
  const { toast } = useToast();
  const [newFilePreviews, setNewFilePreviews] = React.useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const filesValue = watch(name);

  const getFilesArray = (val: any): File[] => {
    if (!val) return [];
    if (val instanceof FileList) return Array.from(val);
    if (Array.isArray(val)) return val.filter((f): f is File => f instanceof File);
    return val instanceof File ? [val] : [];
  };

  React.useEffect(() => {
    const filesArray = getFilesArray(filesValue);
    if (filesArray.length > 0) {
      const urls = filesArray.map((file) => URL.createObjectURL(file));
      setNewFilePreviews(urls);
      return () => {
        urls.forEach((url) => URL.revokeObjectURL(url));
      };
    } else {
      setNewFilePreviews([]);
    }
  }, [filesValue]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const currentFiles = getFilesArray(filesValue);
      const newSelected = Array.from(selectedFiles);
      const updatedFiles = multiple ? [...currentFiles, ...newSelected] : newSelected;
      setValue(name, updatedFiles, { shouldValidate: true });
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemoveNewFile = (index: number) => {
    const currentFiles = getFilesArray(filesValue);
    const updated = currentFiles.filter((_, idx) => idx !== index);
    setValue(name, updated, { shouldValidate: true });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setHasCameraPermission(true);
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description:
          'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], `capture_${Date.now()}.jpg`, {
                type: 'image/jpeg',
              });
              const currentFiles = getFilesArray(filesValue);
              const updatedFiles = multiple ? [...currentFiles, file] : [file];
              setValue(name, updatedFiles, { shouldValidate: true });
              stopCamera();
            }
          },
          'image/jpeg',
          0.9
        );
      }
    }
  };

  const hasError = !!errors[name];
  const hasAnyPhotos = existingUrls.length > 0 || newFilePreviews.length > 0;

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          hasAnyPhotos && 'border-primary',
          hasError && 'border-destructive'
        )}
      >
        {hasAnyPhotos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {existingUrls.map((src, index) => (
              <div key={`existing-${src}-${index}`} className="relative aspect-square group">
                <Image
                  src={src}
                  alt={`Existing photo ${index + 1}`}
                  fill
                  referrerPolicy="no-referrer"
                  className="rounded-md object-cover"
                />
                {onRemoveExistingUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full opacity-90 hover:opacity-100"
                    onClick={() => onRemoveExistingUrl(src)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove photo</span>
                  </Button>
                )}
              </div>
            ))}
            {newFilePreviews.map((src, index) => (
              <div key={`new-${index}`} className="relative aspect-square group">
                <Image
                  src={src}
                  alt={`Selected photo ${index + 1}`}
                  fill
                  unoptimized
                  className="rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full opacity-90 hover:opacity-100"
                  onClick={() => handleRemoveNewFile(index)}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove photo</span>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        <FormControl>
          <Input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            ref={inputRef}
            onChange={handleFileChange}
          />
        </FormControl>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {hasAnyPhotos ? 'Add More Photos' : 'Choose Photos'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" />
            Take Live Photo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Photos are automatically compressed (max 1600px wide) before upload.
        </p>
      </div>
      <FormMessage />

      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Property Photo</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="bg-background/90 backdrop-blur-sm">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access to take live photos of your property.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter className="flex sm:justify-center gap-2">
            <Button type="button" variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={hasCameraPermission === false}
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormItem>
  );
}
