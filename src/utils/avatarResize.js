
export const resizeAvatar = (base64Image, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
            
            console.log('Avatar resized:', {
                originalSize: base64Image.length,
                newSize: resizedBase64.length,
                compressionRatio: (base64Image.length / resizedBase64.length).toFixed(2) + 'x',
                newDimensions: `${width}x${height}`
            });
            
            resolve(resizedBase64);
        };
        
        img.onerror = () => {
            console.error('Failed to resize avatar, using original');
            resolve(base64Image);
        };
        
        img.src = base64Image;
    });
};

export const shouldResizeAvatar = (base64Image, maxSize = 50000) => {
    const needsResize = base64Image && base64Image.length > maxSize;
    console.log('shouldResizeAvatar check:', {
        hasImage: !!base64Image,
        imageSize: base64Image?.length || 0,
        maxSize,
        needsResize
    });
    return needsResize;
};