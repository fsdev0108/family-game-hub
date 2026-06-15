import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/shared/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
        <Toast />
      </SessionProvider>
    </BrowserRouter>
  );
}
