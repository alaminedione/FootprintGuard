//TEST:

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: function (type) {
    if (type === "2d") {
      const ctx = this.getContext("2d"); // Appeler la méthode originale si nécessaire
      for (let i = 0; i < this.width; i++) {
        for (let j = 0; j < this.height; j++) {
          ctx.fillStyle =
            "rgb(" +
            Math.floor(Math.random() * 256) +
            "," +
            Math.floor(Math.random() * 256) +
            "," +
            Math.floor(Math.random() * 256) +
            ")";
          ctx.fillRect(i, j, 1, 1);
        }
      }
      return ctx; // Retourner le contexte après avoir rempli le canvas
    }
    return null; // Pour d'autres types
  },
  writable: true,
  configurable: true
});

Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
  value: function () {
    return this.toDataURL("image/png"); // Appeler la méthode originale
  },
  writable: true,
  configurable: true
});

// (() => {
//   const originalGetContext = HTMLCanvasElement.prototype.getContext;
//
//   HTMLCanvasElement.prototype.getContext = function (type, attributes) {
//     const context = originalGetContext.call(this, type, attributes);
//
//     if (type === '2d') {
//       const originalGetImageData = context.getImageData;
//
//       context.getImageData = function (x, y, width, height) {
//         const imageData = originalGetImageData.call(this, x, y, width, height);
//
//         // Appliquer des modifications variées aux données d'image
//         for (let i = 0; i < imageData.data.length; i += 4) {
//           // Exemple d'altération : inverser les couleurs, ajout d'une légère variation
//           imageData.data[i] = 255 - imageData.data[i];     // Red
//           imageData.data[i + 1] = (imageData.data[i + 1] + Math.floor(Math.random() * 10)) % 256; // Green
//           imageData.data[i + 2] = (imageData.data[i + 2] + Math.floor(Math.random() * 10)) % 256; // Blue
//           // Laisser alpha inchangé
//
//         }
//
//         return imageData;
//       };
//
//       const originalPutImageData = context.putImageData;
//
//       context.putImageData = function (imageData, x, y, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
//         // Modifier les données avant de les remettre dans le canvas
//         for (let i = 0; i < imageData.data.length; i += 4) {
//           imageData.data[i] = (imageData.data[i] + 5) % 256;     // Red
//           imageData.data[i + 1] = (imageData.data[i + 1] + 5) % 256; // Green
//           imageData.data[i + 2] = (imageData.data[i + 2] + 5) % 256; // Blue
//         }
//         return originalPutImageData.call(this, imageData, x, y, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
//       };
//     }
//
//     return context;
//   };
// })();
