# @fujica/auto-i18n

A webpack plugin for automatic internationalization of Chinese text in Vue.js projects.

## Features

- Automatically extracts Chinese text from your source code
- Translates Chinese text to English and Traditional Chinese using various translation APIs
- Supports custom translation presets to override automatic translations
- Integrates with Vue i18n for seamless internationalization
- Transforms Chinese strings to $t() function calls (optional)
- Preserves original Chinese text as comments
- Configurable logging (logLevel, logThrottleMs) and build summary stats

## Installation

```bash
npm install --save-dev @fujica/auto-i18n
```

## Usage

### Basic Configuration

In your `webpack.config.js`:

```js
const AutoI18nPlugin = require('@fujica/auto-i18n');

module.exports = {
  // ... other webpack configurations
  plugins: [
    new AutoI18nPlugin({
      outputPath: './src/locales',
      apiProvider: 'none',  // 'baidu', 'google', 'deepl', 'youdao', or 'none'
      targetLanguages: ['en', 'zh-TW']
    })
  ]
};
```

### Full Configuration Options

```js
new AutoI18nPlugin({
  // Output directory for language JSON files
  outputPath: './src/locales',
  
  // Files to exclude (string or RegExp)
  exclude: [/node_modules/, 'vendor.js'],
  
  // Whether to ignore Chinese text in comments
  ignoreComments: true,
  
  // Translation API key (format depends on provider)
  apiKey: 'your-api-key',
  
  // Translation service provider
  apiProvider: 'baidu',  // 'baidu', 'google', 'deepl', 'youdao', or 'none'
  
  // Source language
  sourceLanguage: 'zh',
  
  // Target languages
  targetLanguages: ['en', 'zh-TW'],
  
  // Custom translation presets
  presets: {
    '你好': {
      'en': 'Hello',
      'zh-TW': '你好'
    },
    '世界': {
      'en': 'World',
      'zh-TW': '世界'
    }
  },
  
  // Whether to transform Chinese strings to i18n function calls
  transformCode: true,

  // Whether to skip machine translation for texts already existing in locale files
  // Still wraps with $t() in code
  skipExistingTranslation: true,

  // Logging level: 'silent' | 'minimal' | 'verbose'
  // minimal: only key phase summary logs
  logLevel: 'minimal'
  // Throttle interval (ms) for lifecycle logs (beforeCompile etc.)
  logThrottleMs: 5000
})
```

## API Provider Configuration

### Baidu Translate

To use Baidu Translation API:
- Sign up for a Baidu Developer account
- Create an application to get app ID and secret
- Set `apiKey` to `'appId:appSecret'`

### Google Translate

To use Google Cloud Translation API:
- Get a Google Cloud API key
- Set `apiKey` to your API key

### DeepL

To use DeepL API:
- Sign up for a DeepL API account
- Get your authentication key
- Set `apiKey` to your DeepL authentication key

### Youdao Translate

To use Youdao Translation API:
- Sign up for a Youdao Developer account
- Create an application to get app key and secret
- Set `apiKey` to `'appKey:appSecret'`

## Output Format

The plugin generates JSON files for each target language:

```
/src/locales/
  ├── en.json
  └── zh-TW.json
```

Example content:

```json
// en.json
{
  "你好": "Hello",
  "世界": "World",
  "欢迎使用": "Welcome to use"
}

// zh-TW.json
{
  "你好": "你好",
  "世界": "世界",
  "欢迎使用": "歡迎使用"
}
```

## Integration with Vue i18n

Make sure you have Vue i18n set up in your project:

```js
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import enMessages from './locales/en.json';
import zhTWMessages from './locales/zh-TW.json';

Vue.use(VueI18n);

const i18n = new VueI18n({
  locale: 'en', // default locale
  messages: {
    'en': enMessages,
    'zh-TW': zhTWMessages
  }
});

new Vue({
  i18n,
  // ...
}).$mount('#app');
```

## Test Project

This repository includes a comprehensive test project to demonstrate the plugin's capabilities. The test project is a full Vue.js application with rich Chinese content.

### Running the Test Project

```bash
# Build the plugin
npm run build

# Navigate to test project
cd test-project

# Install dependencies
npm install

# Link the local plugin
npm link @fujica/auto-i18n

# Run development server
npm run serve

# Test the plugin by building
npm run build
```

The test project includes:
- **Rich Chinese Content**: Vue templates, JavaScript code, user interactions
- **Multiple Pages**: Home, About, Contact pages with different content types
- **Various Vue Features**: Components, routing, forms, events
- **Real-world Scenarios**: User registration, form validation, data display

After running `npm run build`, check the generated files:
- `src/locales/` - Generated translation files
- `dist/` - Transformed code with `$t()` function calls
 - Console summary line (minimal mode):
   `[auto-i18n:summary] Vue files scanned=12 updated=3 skipped=9 chinese=5 newKeys=2`

For detailed information about the test project, see [test-project/README.md](./test-project/README.md).

## License

MIT