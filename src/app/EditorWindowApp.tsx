import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useStandaloneWindowPresentation } from '@/app/useStandaloneWindowPresentation';
import { FileEditorPage } from '@/windows/FileEditorPage';

export function EditorWindowApp() {
  useStandaloneWindowPresentation();

  return (
    <BrowserRouter>
      <FileEditorPage />
      <Toaster richColors closeButton position="bottom-center" className="!z-[999999]" />
    </BrowserRouter>
  );
}
