import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "Sarah & Michael's Wedding - June 15, 2024",
  description = "You're invited to celebrate the wedding of Sarah Johnson and Michael Chen. Join us for our special day on June 15, 2024. RSVP online with your personalized invitation.",
  image = "/images/wedding-hero-og.jpg",
  url = import.meta.env.VITE_APP_URL || "https://sarah-michael-wedding.com",
  type = "website",
  publishedTime,
  modifiedTime,
  author = "Sarah Johnson & Michael Chen",
  keywords = [
    "wedding",
    "Sarah Johnson",
    "Michael Chen",
    "wedding invitation",
    "RSVP",
    "June 2024",
    "wedding celebration",
    "wedding website"
  ]
}) => {
  const fullImageUrl = image.startsWith('http') ? image : `${url}${image}`;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : url;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={author} />
      <link rel="canonical" href={currentUrl} />
      
      {/* Viewport and Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="theme-color" content="#e11d48" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Sarah & Michael's Wedding" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Sarah and Michael's Wedding Invitation" />
      <meta property="og:site_name" content="Sarah & Michael's Wedding" />
      <meta property="og:locale" content="en_US" />
      
      {/* Wedding-specific Open Graph */}
      <meta property="wedding:couple" content="Sarah Johnson & Michael Chen" />
      <meta property="wedding:date" content="2024-06-15" />
      <meta property="wedding:location" content="Garden Manor, Napa Valley, CA" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content="Sarah and Michael's Wedding Invitation" />
      <meta name="twitter:creator" content="@sarahandmichael" />
      
      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          "name": "Sarah Johnson & Michael Chen Wedding",
          "description": description,
          "startDate": "2024-06-15T16:00:00-07:00",
          "endDate": "2024-06-15T23:00:00-07:00",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": {
            "@type": "Place",
            "name": "Garden Manor",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "123 Vineyard Lane",
              "addressLocality": "Napa Valley",
              "addressRegion": "CA",
              "postalCode": "94558",
              "addressCountry": "US"
            }
          },
          "image": [fullImageUrl],
          "organizer": [
            {
              "@type": "Person",
              "name": "Sarah Johnson"
            },
            {
              "@type": "Person", 
              "name": "Michael Chen"
            }
          ],
          "offers": {
            "@type": "Offer",
            "url": currentUrl,
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2024-01-01T00:00:00-08:00"
          },
          "performer": {
            "@type": "MusicGroup",
            "name": "The Wedding Band"
          }
        })}
      </script>
      
      {/* Additional Schema for Wedding */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Sarah & Michael's Wedding",
          "description": description,
          "url": url,
          "author": {
            "@type": "Person",
            "name": author
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${url}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        })}
      </script>
      
      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/android-chrome-192x192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/android-chrome-512x512.png" />
      
      {/* Web App Manifest */}
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Preconnect for Performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://sheets.googleapis.com" />
      <link rel="preconnect" href="https://api.emailjs.com" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="dns-prefetch" href="//www.googletagmanager.com" />
      
      {/* Content Language */}
      <meta httpEquiv="content-language" content="en-US" />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      
      {/* Article specific meta (if type is article) */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      
      {/* Wedding-specific meta tags */}
      <meta name="wedding.date" content="2024-06-15" />
      <meta name="wedding.location" content="Garden Manor, Napa Valley, CA" />
      <meta name="wedding.couple" content="Sarah Johnson & Michael Chen" />
      <meta name="wedding.rsvp" content="true" />
      
      {/* Performance and Loading */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="msapplication-tap-highlight" content="no" />
      
      {/* Security */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      
      {/* Preload critical resources */}
      <link 
        rel="preload" 
        href="/fonts/cormorant-garamond-v16-latin-regular.woff2" 
        as="font" 
        type="font/woff2" 
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="/fonts/dancing-script-v25-latin-regular.woff2" 
        as="font" 
        type="font/woff2" 
        crossOrigin="anonymous"
      />
      <link 
        rel="preload" 
        href="/images/hero-background.webp" 
        as="image" 
        type="image/webp"
      />
    </Helmet>
  );
};

export default SEOHead;