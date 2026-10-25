import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceApp from './workspace/WorkspaceApp.jsx';
import './styles.css';
import './workspace/workspace.css';
import './workspace/area2.css';
import './workspace/area3.css';
import './workspace/area4.css';
import './workspace/area5.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkspaceApp />
    </BrowserRouter>
  </React.StrictMode>,
);
