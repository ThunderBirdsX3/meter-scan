import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class CameraService {
  async takePhoto(): Promise<string> {
    const photo = await Camera.takePhoto({});
    return photo.uri!;
  }

  async pickFromGallery(): Promise<string> {
    const photos = await Camera.getLimitedLibraryPhotos();
    return photos.photos[0].webPath;
  }
}
