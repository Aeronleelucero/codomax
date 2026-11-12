import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      success: true,
      message: 'Artikly API is running.',
      data: {
        service: 'Artikly Backend',
        api: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;