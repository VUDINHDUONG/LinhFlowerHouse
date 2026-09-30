declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_USER_ID?: string;
    ADMIN_EMAIL?: string;
    ADMIN_LOCAL_TOKEN?: string;
    ADMIN_PASSWORD?: string;
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
  }
}
