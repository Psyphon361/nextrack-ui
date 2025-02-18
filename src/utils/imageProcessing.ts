interface ProcessedImage {
  file: File;
  previewUrl: string;
}

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function validateImage(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image size must be less than 2MB');
  }
  
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
}

export async function processImage(file: File): Promise<ProcessedImage> {
  validateImage(file);

  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}
