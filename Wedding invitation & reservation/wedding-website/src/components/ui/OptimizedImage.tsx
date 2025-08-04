import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad,
  onError
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URLs for different formats and sizes
  const generateSrcSet = (baseSrc: string): string => {
    const sizes = [640, 750, 828, 1080, 1200, 1920];
    const formats = ['avif', 'webp', 'jpg'];
    
    return sizes
      .map(size => {
        // If using Vercel Image Optimization
        const optimizedUrl = `/_next/image?url=${encodeURIComponent(baseSrc)}&w=${size}&q=75`;
        return `${optimizedUrl} ${size}w`;
      })
      .join(', ');
  };

  // Generate different format sources for modern browsers
  const generateSources = (baseSrc: string) => {
    const formats = [
      { format: 'image/avif', extension: 'avif' },
      { format: 'image/webp', extension: 'webp' }
    ];

    return formats.map(({ format, extension }) => ({
      srcSet: generateSrcSet(baseSrc.replace(/\.(jpg|jpeg|png)$/i, `.${extension}`)),
      type: format
    }));
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Placeholder blur effect
  const getBlurDataURL = (): string => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjNmNGY2Ii8+Cjwvc3ZnPgo=';
  };

  const imageStyle: React.CSSProperties = {
    transition: 'opacity 0.3s ease',
    opacity: imageLoaded ? 1 : 0,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    objectFit: 'cover'
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: imageLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease',
    backgroundImage: placeholder === 'blur' ? `url(${getBlurDataURL()})` : 'none',
    backgroundColor: '#f3f4f6',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: placeholder === 'blur' ? 'blur(20px)' : 'none',
    transform: placeholder === 'blur' ? 'scale(1.1)' : 'none'
  };

  if (imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={{ width: width || '100%', height: height || '200px' }}
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto'
      }}
    >
      {/* Placeholder */}
      <div style={placeholderStyle} />
      
      {/* Optimized Image */}
      {isInView && (
        <picture>
          {generateSources(src).map(({ srcSet, type }, index) => (
            <source
              key={index}
              srcSet={srcSet}
              type={type}
              sizes={sizes}
            />
          ))}
          <img
            src={src}
            alt={alt}
            style={imageStyle}
            className="w-full h-full object-cover"
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            width={width}
            height={height}
            sizes={sizes}
          />
        </picture>
      )}
      
      {/* Loading indicator */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="spinner spinner-small" style={{ borderTopColor: 'var(--color-primary)' }} />
        </div>
      )}
    </motion.div>
  );
};

export default OptimizedImage;