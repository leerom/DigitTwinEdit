import { describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { uploadSingle } from '../upload';

describe('upload middleware', () => {
  const createApp = () => {
    const app = express();
    app.post('/upload', uploadSingle, (req, res) => {
      res.status(200).json({ originalname: (req as any).file?.originalname ?? null });
    });
    return app;
  };

  it('accepts hdr files with Radiance mime type', async () => {
    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('hdr-data'), {
        filename: 'studio.hdr',
        contentType: 'image/vnd.radiance',
      });

    expect(response.status).toBe(200);
    expect(response.body.originalname).toBe('studio.hdr');
  });

  it('accepts exr files with EXR mime type', async () => {
    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('exr-data'), {
        filename: 'studio.exr',
        contentType: 'image/x-exr',
      });

    expect(response.status).toBe(200);
    expect(response.body.originalname).toBe('studio.exr');
  });
});
