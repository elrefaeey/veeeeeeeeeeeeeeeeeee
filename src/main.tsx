import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress ERR_BLOCKED_BY_CLIENT errors in console (caused by ad blockers)
const originalError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ');
  if (
    errorString.includes('ERR_BLOCKED_BY_CLIENT') ||
    errorString.includes('net::ERR_BLOCKED_BY_CLIENT')
  ) {
    return; // Suppress this specific error
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
