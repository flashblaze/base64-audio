import { MantineProvider } from '@mantine/core';
import Home from './pages/home';

import './App.css';
import '@mantine/core/styles.layer.css';
import theme from './utils/theme';

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Home />
    </MantineProvider>
  );
}

export default App;
