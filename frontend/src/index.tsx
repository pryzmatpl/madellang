import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from '@/App';
import reportWebVitals from '@/reportWebVitals';
console.log(process.env.REACT_APP_API_URL);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to measure performance, pass a function to log results
reportWebVitals(console.log); 