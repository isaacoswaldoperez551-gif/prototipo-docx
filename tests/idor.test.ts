/**
 * Tests Automatizados de Seguridad: Anti-IDOR, Control de Acceso y Concurrencia Optimista
 * Framework: Vitest / Supertest
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import documentRoutes from '../src/server/routes/documentRoutes.ts';
import { db } from '../src/server/db/dataStore.ts';
import { createAccessToken } from '../src/server/security/crypto.ts';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/documents', documentRoutes);

describe('OWASP Anti-IDOR y Control de Concurrencia', () => {
  const carlos = Array.from(db.users.values()).find((u) => u.email === 'carlos.mendoza@empresa.com')!;
  const sofia = Array.from(db.users.values()).find((u) => u.email === 'sofia.valdez@empresa.com')!;

  const tokenCarlos = createAccessToken({
    id: carlos.id,
    nombre: carlos.nombre,
    email: carlos.email,
    rol: carlos.rol,
  });

  const tokenSofia = createAccessToken({
    id: sofia.id,
    nombre: sofia.nombre,
    email: sofia.email,
    rol: sofia.rol,
  });

  // Doc 3: Asignado ÚNICAMENTE a Sofía
  const sofiaDoc = Array.from(db.documents.values()).find((d) => d.titulo.includes('Auditoría Financiera'))!;
  // Doc 2: Asignado a Carlos con permiso READ
  const readOnlyDoc = Array.from(db.documents.values()).find((d) => d.titulo.includes('Manual de Políticas'))!;
  // Doc 1: Asignado a Carlos con permiso EDIT
  const editDoc = Array.from(db.documents.values()).find((d) => d.titulo.includes('Plan Estratégico'))!;

  it('1. ANTI-IDOR: El Usuario A (Carlos) recibe 404 (y NO 403) al pedir un documento asignado solo al Usuario B (Sofía)', async () => {
    const res = await request(app)
      .get(`/api/documents/${sofiaDoc.id}`)
      .set('Cookie', [`access_token=${tokenCarlos}`]);

    // Requisito estricto: Devolver 404 para no filtrar la existencia del UUID
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Documento no encontrado o no disponible.');
    expect(res.body.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('2. El Usuario B (Sofía) SÍ puede acceder a su documento legítimo (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/documents/${sofiaDoc.id}`)
      .set('Cookie', [`access_token=${tokenSofia}`]);

    expect(res.status).toBe(200);
    expect(res.body.document.id).toBe(sofiaDoc.id);
  });

  it('3. EDICIÓN DENEGADA: Usuario con permiso READ recibe 403 Forbidden al intentar modificar contenido', async () => {
    const res = await request(app)
      .put(`/api/documents/${readOnlyDoc.id}/content`)
      .set('Cookie', [`access_token=${tokenCarlos}`])
      .send({
        content: '# Modificación no autorizada...',
        version: readOnlyDoc.version_actual,
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSION');
  });

  it('4. CONCURRENCIA OPTIMISTA: Modificación con versión obsoleta genera 409 Conflict', async () => {
    const staleVersion = editDoc.version_actual - 1; // versión desfasada

    const res = await request(app)
      .put(`/api/documents/${editDoc.id}/content`)
      .set('Cookie', [`access_token=${tokenCarlos}`])
      .send({
        content: '# Intento de sobreescritura...',
        version: staleVersion,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OPTIMISTIC_LOCK_CONFLICT');
    expect(res.body.serverVersion).toBe(editDoc.version_actual);
  });
});
