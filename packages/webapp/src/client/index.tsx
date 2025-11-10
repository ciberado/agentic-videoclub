import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import App from './App';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const container = document.getElementById('root');
if (!container) {
    throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <MantineProvider>
            <Notifications />
            <App />
        </MantineProvider>
    </React.StrictMode>
);