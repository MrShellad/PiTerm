import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useStandaloneWindowPresentation } from '@/app/useStandaloneWindowPresentation';
import { AdvancedMonitorPage } from '@/features/monitor/presentation/AdvancedMonitorPage';

export function MonitorWindowApp() {
  useStandaloneWindowPresentation();

  return (
    <BrowserRouter>
      <AdvancedMonitorPage />
      <Toaster richColors closeButton position="top-center" className="!z-[999999]" />
    </BrowserRouter>
  );
}
