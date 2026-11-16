import { Router } from 'express';
import pool from '../config/postgres.js';
const router = Router();
router.get('/live', (req, res) => res.json({ success: true, status: 'ok' }));
async function ready(req, res) {
  try {
    await pool.query({ text: 'SELECT 1', query_timeout: 2000 });
    res.json({ success: true, status: 'ready' });
  } catch {
    res.status(503).json({ success: false, status: 'unavailable' });
  }
}
router.get('/', ready);
router.get('/ready', ready);
export default router;
