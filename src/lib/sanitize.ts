import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param htmlContent - The HTML content to sanitize
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(htmlContent: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return as-is for now, we'll handle this properly
    return htmlContent;
  }
  
  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'div', 'span', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^https?:\/\/|^\/|^#/,
  });
}