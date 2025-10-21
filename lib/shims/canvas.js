// Minimal stub so pdfjs can import 'canvas' without native .node
module.exports = {
  // pdf.js only needs these when rendering (we don't render)
  createCanvas: function () {
    return {
      getContext: () => ({}),
      toBuffer: () => Buffer.from([]),
      toDataURL: () => "",
    };
  },
  Image: function () {},
  CanvasRenderingContext2D: function () {},
  Path2D: function () {},
};
