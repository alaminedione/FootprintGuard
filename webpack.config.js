import path from 'path';
import fs from 'fs';
import CleanCSS from 'clean-css';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';
import { minify } from 'html-minifier';

// Obtenir le chemin du dossier courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier dist et ses sous-dossiers s'ils n'existent pas
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Fonction pour minifier le CSS
const minifyCSS = (inputFile, outputFile) => {
  const content = fs.readFileSync(inputFile, 'utf8');
  const output = new CleanCSS().minify(content).styles;
  fs.writeFileSync(outputFile, output);
};

// Fonction pour minifier le HTML
const minifyHTML = (inputFile, outputFile) => {
  const content = fs.readFileSync(inputFile, 'utf8');
  const output = minify(content, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
  });
  fs.writeFileSync(outputFile, output);
};

// Fonction pour copier un dossier
const copyDirectory = (source, target) => {
  createDirIfNotExists(target);
  fs.readdirSync(source).forEach((file) => {
    const srcFile = path.join(source, file);
    const destFile = path.join(target, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDirectory(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
};

// Configuration Webpack
export default {
  entry: {
    popup: './popup.js',
    settings: './settings.js',
    background: './background.js',
    spoofCanvas: './spoofer/spoof-canvas.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.emit.tapAsync('CopyHTMLPlugin', (compilation, callback) => {
          createDirIfNotExists(path.resolve(__dirname, 'dist/spoofer'));
          createDirIfNotExists(path.resolve(__dirname, 'dist/css'));

          minifyCSS('./css/popup.css', path.resolve(__dirname, 'dist/css/popup.css'));
          minifyCSS('./css/settings.css', path.resolve(__dirname, 'dist/css/settings.css'));

          fs.copyFileSync('./manifest.json', path.resolve(__dirname, 'dist/manifest.json'));

          const spoofCanvasOutput = path.resolve(__dirname, 'dist/spoofer/spoof-canvas.js');
          const spoofCanvasSource = compilation.assets['spoofCanvas.js'].source();
          fs.writeFileSync(spoofCanvasOutput, spoofCanvasSource);
          delete compilation.assets['spoofCanvas.js'];

          copyDirectory(path.resolve(__dirname, 'icons'), path.resolve(__dirname, 'dist/icons'));

          // Minifie et copie les fichiers HTML
          minifyHTML('./popup.html', path.resolve(__dirname, 'dist/popup.html'));
          minifyHTML('./settings.html', path.resolve(__dirname, 'dist/settings.html'));

          callback();
        });
      },
    },
  ],
};

