import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Test endpoint for student API
 */
router.get('/test-students', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Student API routes are accessible',
    data: {
      availableEndpoints: [
        'GET /api/v1/admin/students/stats',
        'GET /api/v1/admin/students',
        'GET /api/v1/admin/students/export',
        'GET /api/v1/admin/students/:id',
        'PATCH /api/v1/admin/students/:id/status',
        'DELETE /api/v1/admin/students/:id',
        'POST /api/v1/admin/students/notify'
      ]
    }
  });
});

export default router;
