//TEST:
(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function (type, attributes) {
    const context = originalGetContext.call(this, type, attributes);

    if (type === '2d') {
      const originalGetImageData = context.getImageData;

      // Définir getImageData avec Object.defineProperty
      Object.defineProperty(context, 'getImageData', {
        value: function (x, y, width, height) {
          const imageData = originalGetImageData.call(this, x, y, width, height);

          // Appliquer des modifications variées aux données d'image
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = 255 - imageData.data[i]; // Red
            imageData.data[i + 1] = (imageData.data[i + 1] + Math.floor(Math.random() * 10)) % 256; // Green
            imageData.data[i + 2] = (imageData.data[i + 2] + Math.floor(Math.random() * 10)) % 256; // Blue
          }

          return imageData;
        },
        writable: true,
        enumerable: false,
        configurable: true,
      });

      const originalPutImageData = context.putImageData;

      // Définir putImageData avec Object.defineProperty
      Object.defineProperty(context, 'putImageData', {
        value: function (imageData, x, y, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
          // Modifier les données avant de les remettre dans le canvas
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = (imageData.data[i] + 5) % 256; // Red
            imageData.data[i + 1] = (imageData.data[i + 1] + 5) % 256; // Green
            imageData.data[i + 2] = (imageData.data[i + 2] + 5) % 256; // Blue
          }
          return originalPutImageData.call(this, imageData, x, y, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
        },
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }

    return context;
  };
})();



