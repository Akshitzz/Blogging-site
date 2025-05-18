import axios from "axios"

const resizeImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', 0.9);
            };
        };
    });
};

export const uploadImage = async (img) => {
    try {
        // Resize image before upload
        const resizedImage = await resizeImage(img);
        
        // Get the signed URL from our server
        const { data: { uploadURL } } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/get-upload-url");
        
        // Upload the file to S3
        await axios.put(uploadURL, resizedImage, {
            headers: {
                'Content-Type': 'image/jpeg'
            }
        });

        // Return the URL without the query parameters
        return uploadURL.split("?")[0];
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error("Failed to upload image: " + error.message);
    }
}