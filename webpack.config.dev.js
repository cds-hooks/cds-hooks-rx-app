const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');

module.exports = merge(common, {
  devtool: 'inline-source-map',
  devServer: {
    contentBase: './build',
  },
});

const postCssLoader = {
  loader: 'postcss-loader',
  options: {
    plugins() {
      return [
        Autoprefixer({
          browsers: [
            'ie >= 10',
            'last 2 versions',
            'last 2 android versions',
            'last 2 and_chr versions',
            'iOS >= 8',
          ],
        }),
        CustomProperties(),
      ];
    },
  },
};

const sassLoader = {
  loader: 'sass-loader',
}

const config = {
  entry: {
    'app': ['babel-polyfill', `${SRC_DIR}/index.jsx`],
    'smart-launch': ['babel-polyfill', `${SRC_DIR}/retrieve-data-helpers/smart-authorize.js`],
  },
  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',
  },
  context: __dirname,
  resolve: {
    extensions: ['.js', '.jsx', '.json', '*'],
    modules: [path.resolve(__dirname, 'aggregated-translations'), 'node_modules'],
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        include: globalCss,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            cssLoaderNoModules,
            postCssLoader,
            sassLoader
          ],
        }),
      },
      {
        test: /\.(scss|css)$/,
        exclude: globalCss,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            cssLoaderWithModules,
            postCssLoader,
            sassLoader
          ],
        }),
      },
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]'
            }
          }
        ] 
      },
      {
        test: /\.jsx?/,
        include: SRC_DIR,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.pem/,
        use: [
          {
            loader: 'raw-loader'
          }
        ]
      },
    ],
  },
  plugins: [
    new ExtractTextPlugin('styles.css'),
    new I18nAggregatorPlugin({
      baseDirectory: __dirname,
      supportedLocales: i18nSupportedLocales,
    }),
    new webpack.NamedChunksPlugin(),
    new webpack.DefinePlugin({
      'runtime.FHIR_URL': JSON.stringify(process.env.FHIR_URL || 'https://api.hspconsortium.org/cdshooksdstu2/open')
    }),
  ],
};

module.exports = config;
