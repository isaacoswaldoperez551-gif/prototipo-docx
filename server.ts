import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/server/routes/authRoutes.ts';
import documentRoutes from './src/server/routes/documentRoutes.ts';
import adminRoutes from './src/server/routes/adminRoutes.ts';
import securityTestRoutes from './src/server/routes/securityTestRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Cabeceras de Seguridad HTTP (Compatibles con preview en iframe)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.removeHeader('X-Frame-Options');
    next();
  });

  // 2. Parsers de Carga Útil y Cookies Seguras
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 3. Rutas de la API REST
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/security-test', securityTestRoutes);

  // Endpoint de salud
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'UP',
      service: 'DocuGuard API',
      timestamp: new Date().toISOString(),
      security: {
        antiIdor: 'ENFORCED',
        rbac: 'ENFORCED',
        optimisticLocking: 'ENABLED',
        tokenRotation: 'ENABLED',
      },
    });
  });

  // 4. Integración de Frontend con Vite
  if (!isProd) {
    const fs = await import('fs');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Servir index.html transformado por Vite para soporte total SPA
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // 5. Manejador Global de Errores
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({
      error: 'Ocurrió un error interno en el servidor.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[DocuGuard Server] Ejecutando en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al inicializar el servidor:', err);
  process.exit(1);
});
