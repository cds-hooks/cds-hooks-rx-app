require('!style-loader!css-loader!sass-loader!../assets/stylesheets/style.scss');

// TODO: Require assets here.
// require('../assets/images/product.png');

import App from './components/App.js';
import React from 'react';

React.render(<App/>, document.getElementById('react-wrapper'));
