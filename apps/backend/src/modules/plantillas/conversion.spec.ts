/**
 * TDD RED: conversion helpers unit tests (no DB, pure functions).
 * Tests for docxToTexto and textoToDocxBuffer.
 */
import { docxToTexto, textoToDocxBuffer } from './conversion';

describe('conversion helpers', () => {
  describe('textoToDocxBuffer', () => {
    it('returns a non-empty Buffer', async () => {
      const buf = await textoToDocxBuffer('Hello world');
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('handles multi-line text (creates one paragraph per line)', async () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const buf = await textoToDocxBuffer(text);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('handles text with template variables {{expediente.nombre}}', async () => {
      const text = 'El expediente {{expediente.nombre}} está activo';
      const buf = await textoToDocxBuffer(text);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });

    it('handles empty string', async () => {
      const buf = await textoToDocxBuffer('');
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);
    });
  });

  describe('docxToTexto roundtrip', () => {
    it('roundtrip: textoToDocxBuffer then docxToTexto preserves {{expediente.nombre}} marker', async () => {
      const original = 'El expediente {{expediente.nombre}} está activo.';
      const buf = await textoToDocxBuffer(original);
      const recovered = await docxToTexto(buf);
      expect(recovered).toContain('{{expediente.nombre}}');
    });

    it('roundtrip: preserves {{contacto.cliente.nif}} marker (3-part variable)', async () => {
      const original = 'NIF del cliente: {{contacto.cliente.nif}}';
      const buf = await textoToDocxBuffer(original);
      const recovered = await docxToTexto(buf);
      expect(recovered).toContain('{{contacto.cliente.nif}}');
    });

    it('roundtrip: preserves plain text content', async () => {
      const original = 'Texto simple sin variables';
      const buf = await textoToDocxBuffer(original);
      const recovered = await docxToTexto(buf);
      expect(recovered.trim()).toContain('Texto simple sin variables');
    });
  });
});
