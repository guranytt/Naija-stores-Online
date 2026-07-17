/**
 * Fullstack Cloudinary Upload Action Dispatcher for React frontend
 * Handles file-to-base64 reading and secure server API routing.
 */
import imageCompression from 'browser-image-compression';

export interface CloudinaryUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  bytes?: number;
  format?: string;
}

/**
 * Uploads a base64 encoded image string or raw base64 data URL directly to Cloudinary
 */
export async function uploadToCloudinary(base64Image: string): Promise<CloudinaryUploadResponse> {
  try {
    const cloudUrl = "https://api.cloudinary.com/v1_1/dqpjjfsya/image/upload";
    const uploadPreset = "naija_stores";

    const formData = new FormData();
    formData.append("file", base64Image.startsWith("data:image") ? base64Image : `data:image/jpeg;base64,${base64Image}`);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(cloudUrl, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        url: data.secure_url,
        bytes: data.bytes,
        format: data.format,
      };
    } else {
      const errText = await response.text();
      console.error("[CLOUDINARY ERROR]", response.status, errText);
      return { success: false, error: `Cloudinary upload failed: ${response.status}` };
    }
  } catch (error: any) {
    console.error("[CLOUDINARY EXCEPTION]", error);
    return { success: false, error: error.message || "Failed to upload to Cloudinary" };
  }
}

/**
 * Helper to convert standard browser File objects to Base64 strings compatible with Cloudinary API
 */
export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Compresses an image client-side before uploading.
 * Maximum width/height is capped at 1600px and file size is soft-capped ~500KB.
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.8,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Image compression failed:", error);
    return file; // fallback to original file if compression fails
  }
}
