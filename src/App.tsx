import { BrowserRouter } from 'react-router-dom';
import { useAppData } from './hooks/useAppData';
import AppRoutes from './routes';

export default function App() {
  const { zones, readers, dockets, notifications } = useAppData();

  return (
    <BrowserRouter>
      <AppRoutes zones={zones} readers={readers} dockets={dockets} notifications={notifications} />
    </BrowserRouter>
  );
}
