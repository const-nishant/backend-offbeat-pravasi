---
name: media-uploads
description: Media upload patterns for Cloudflare R2, presigned URLs, file validation, and CDN delivery
---

# Media Uploads

Media handling patterns for this project's Cloudflare R2 integration.

## Upload Flow
1. Client requests presigned upload URL via API
2. Server generates presigned PUT URL with expiration (configurable TTL)
3. Client uploads directly to R2
4. Server receives webhook or client notifies on completion
5. Media metadata saved to database

## File Validation
- Validate file type (MIME whitelist) and size limits server-side
- Reject uploads for disallowed types before generating presigned URL
- Max file sizes: images (10MB), videos (100MB), documents (20MB)

## Storage Path Convention
- `uploads/{module}/{entityId}/{uuid}.{ext}`
- Example: `uploads/profiles/user_abc123/photo_xyz.jpg`
- Never use user-provided filenames on S3

## CDN & Caching
- Serve files through Cloudflare CDN
- Set appropriate Cache-Control headers: images (1y), documents (1h)
- Use content-addressable URLs for immutable files
