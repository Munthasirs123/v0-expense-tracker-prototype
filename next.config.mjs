/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  webpack: (config, { isServer }) => {
    // 1) Never let pdfjs pull native canvas
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: path.resolve(process.cwd(), "lib/shims/canvas.js"),
      // If anything tries to hit the browser build, force it to legacy
      "pdfjs-dist/build/pdf.js": "pdfjs-dist/legacy/build/pdf.js",
    };

    if (isServer) {
      // 2) Make ALL pdfjs-dist imports true externals (not bundled)
      const previousExternals = config.externals ?? [];
      config.externals = [
        // our filter
        function (_ctx, callback) {
          const req = _ctx.request || "";
          if (/^pdfjs-dist(\/.*)?$/.test(req)) {
            // tell webpack "leave this to runtime require()"
            return callback(null, "commonjs " + req);
          }
          return typeof previousExternals === "function"
            ? previousExternals(_ctx, callback)
            : callback();
        },
        // keep any existing externals array entries
        ...(Array.isArray(previousExternals) ? previousExternals : []),
      ];
    }

    return config;
  },
};

export default nextConfig;
