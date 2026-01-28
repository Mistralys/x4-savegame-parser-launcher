import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import { ConfigProvider } from './context/ConfigContext';
import { ErrorProvider } from './context/ErrorContext';
import { ValidationProvider } from './context/ValidationContext';
import { ProcessProvider } from './context/ProcessContext';
import './App.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <ConfigProvider>
          <ValidationProvider>
            <ProcessProvider>
              <ErrorProvider>
                <App />
              </ErrorProvider>
            </ProcessProvider>
          </ValidationProvider>
        </ConfigProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
