/**
 * Enhanced Upload Area Component - 2026 UX Standards
 * Features: Drag & drop, validation, progress tracking, accessibility, micro-interactions
 */
import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';

interface EnhancedUploadAreaProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
  showProgress?: boolean;
  autoUpload?: boolean;
}

export const EnhancedUploadArea: React.FC<EnhancedUploadAreaProps> = ({
  onUploadComplete,
  onUploadError,
  acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/tif',
  ],
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
  disabled = false,
  className,
  placeholder = 'Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen',
  showPreview = true,
  showProgress = true,
  autoUpload = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<
    Record<string, 'idle' | 'uploading' | 'completed' | 'error'>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File): React.ReactNode => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf':
        return (
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V20C17 20.5523 16.5523 21 16 21H8C7.44772 21 7 20.5523 7 20V18"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M13 1V5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 13V11H14V13H10Z" fill="currentColor" />
              <path d="M10 17V15H14V17H10Z" fill="currentColor" />
            </svg>
          </div>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'bmp':
      case 'tiff':
      case 'tif':
        return (
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path
                d="M21 15L16 10L5 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V20C17 20.5523 16.5523 21 16 21H8C7.44772 21 7 20.5523 7 20V4Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 7V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M15 10H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        );
    }
  };

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const allowedExts = acceptedTypes.map((type) => type.split('/').pop()).filter(Boolean);
        return `Dateityp nicht unterstützt. Erlaubt: ${allowedExts.join(', ')}`;
      }

      // Check file size
      if (file.size > maxSize) {
        return `Datei zu groß. Maximal ${formatFileSize(maxSize)}`;
      }

      // Check PDF validity
      if (file.type === 'application/pdf') {
        return null; // Async PDF validation would go here
      }

      return null;
    },
    [acceptedTypes, maxSize]
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles = Array.from(fileList);

      // Validate files
      const validFiles: File[] = [];
      const newErrors: Record<string, string> = {};

      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          newErrors[file.name] = error;
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length > 0) {
        setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles));

        // Initialize upload states
        const newStatus: Record<string, 'idle' | 'uploading' | 'completed' | 'error'> = {};
        const newProgress: Record<string, number> = {};

        validFiles.forEach((file) => {
          newStatus[file.name] = 'idle';
          newProgress[file.name] = 0;
        });

        setUploadStatus((prev) => ({ ...prev, ...newStatus }));
        setUploadProgress((prev) => ({ ...prev, ...newProgress }));

        if (autoUpload) {
          for (const file of validFiles) {
            await handleUpload(file);
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
        Object.values(newErrors).forEach((error) => onUploadError?.(error));
      }
    },
    [validateFile, multiple, autoUpload, onUploadError]
  );

  const handleUpload = async (file: File) => {
    setUploadStatus((prev) => ({ ...prev, [file.name]: 'uploading' }));

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const current = prev[file.name] || 0;
        if (current >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [file.name]: current + Math.random() * 10 };
      });
    }, 100);

    try {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      setUploadStatus((prev) => ({ ...prev, [file.name]: 'completed' }));

      onUploadComplete?.({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadTime: Date.now(),
      });

      // Auto-remove completed items after 3 seconds
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.name !== file.name));
        setUploadStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[file.name];
          return newStatus;
        });
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }, 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus((prev) => ({ ...prev, [file.name]: 'error' }));
      onUploadError?.(`Upload fehlgeschlagen: ${file.name}`);
    }
  };

  const handleRemoveFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.name !== file.name));
    setUploadStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[file.name];
      return newStatus;
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[file.name];
      return newProgress;
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[file.name];
      return newErrors;
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    e.target.value = ''; // Reset input
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'text-primary';
      case 'completed':
        return 'text-success';
      case 'error':
        return 'text-error';
      default:
        return 'text-text-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        );
      case 'completed':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-success">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 12l3 3 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-error">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 8v4M12 16h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx(
        'w-full',
        'border-2',
        'border-dashed',
        'border-border',
        'rounded-xl',
        'p-6',
        'transition-all',
        'duration-300',
        'ease-in-out',
        'bg-surface/30',
        'hover:bg-surface/40',
        isDragging && 'border-primary bg-surface/50 scale-[1.02]',
        disabled && 'opacity-50 cursor-not-allowed border-border/40',
        className
      )}
    >
      {/* Drop Zone Content */}
      <div
        className="text-center cursor-pointer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {/* Upload Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={clsx(
              'w-16 h-16',
              'bg-surface',
              'border',
              'border-border',
              'rounded-2xl',
              'flex',
              'items-center',
              'justify-center',
              'transition-all',
              'duration-300',
              isDragging && 'scale-110 bg-primary/10 border-primary/30',
              'hover:scale-110'
            )}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              className={clsx('text-text-muted', isDragging && 'text-primary')}
            >
              <path
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-text">
            {isDragging ? 'Dateien hier ablegen' : 'Dateien hochladen'}
          </p>
          <p className="text-text-muted">{placeholder}</p>
          <p className="text-xs text-text-muted">
            Unterstützte Formate: PDF, JPG, PNG, BMP, TIFF • Max. {formatFileSize(maxSize)}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
            disabled={disabled}
            className={clsx(
              'px-6',
              'py-2',
              'bg-primary',
              'text-white',
              'rounded-lg',
              'font-medium',
              'hover:bg-primary/90',
              'transition-all',
              'duration-300',
              'hover:scale-105',
              'active:scale-95',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            Dateien auswählen
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">
              Hochgeladene Dateien ({files.length})
            </span>
            <button
              onClick={() => {
                setFiles([]);
                setUploadStatus({});
                setUploadProgress({});
                setErrors({});
              }}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Alle löschen
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file) => {
              const status = uploadStatus[file.name] || 'idle';
              const progress = uploadProgress[file.name] || 0;
              const error = errors[file.name];

              return (
                <div
                  key={file.name}
                  className={clsx(
                    'flex',
                    'items-center',
                    'gap-3',
                    'p-3',
                    'bg-surface',
                    'border',
                    'border-border',
                    'rounded-lg',
                    'transition-all',
                    'duration-300',
                    status === 'uploading' && 'ring-1 ring-primary/20',
                    status === 'completed' && 'ring-1 ring-success/20',
                    status === 'error' && 'ring-1 ring-error/20'
                  )}
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">{getFileIcon(file)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text truncate">{file.name}</span>
                      <span className="text-xs text-text-muted bg-surface-hover px-2 py-1 rounded-full">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {showProgress && status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted w-12 text-right">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    {status !== 'idle' && (
                      <div className={clsx('flex', 'items-center', 'gap-2', 'mt-1', 'text-sm')}>
                        <span className={getStatusColor(status)}>{getStatusIcon(status)}</span>
                        <span className={getStatusColor(status)}>
                          {/* eslint-disable-next-line @typescript-eslint/no-shadow */}
                          {status === 'uploading'
                            ? 'Wird hochgeladen...'
                            : status === 'completed'
                              ? 'Erfolgreich hochgeladen'
                              : status === 'error'
                                ? 'Upload fehlgeschlagen'
                                : ''}
                        </span>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="mt-1 text-sm text-error flex items-center gap-2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="text-error"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path
                            d="M12 8v4M12 16h.01"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {status === 'idle' && !error && (
                      <button
                        onClick={() => handleUpload(file)}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Hochladen
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveFile(file)}
                      className="p-1 text-text-muted hover:text-error transition-colors"
                      aria-label={`Datei ${file.name} entfernen`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 18L18 6M6 6l12 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.join(',')}
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />
    </div>
  );
};
