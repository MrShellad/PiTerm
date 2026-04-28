import './locales/i18n';

import { EditorWindowApp } from '@/app/EditorWindowApp';
import { MainAppShell } from '@/app/MainAppShell';
import { MonitorWindowApp } from '@/app/MonitorWindowApp';

const EDITOR_WINDOW_PATH = '/editor_window';
const MONITOR_WINDOW_PATH = '/advanced-monitor';

function App() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  if (pathname === EDITOR_WINDOW_PATH) return <EditorWindowApp />;
  if (pathname === MONITOR_WINDOW_PATH) return <MonitorWindowApp />;
  return <MainAppShell />;
}

export default App;
