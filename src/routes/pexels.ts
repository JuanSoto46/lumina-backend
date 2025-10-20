/* This TypeScript code snippet is setting up a router using the Express framework. It imports the
`Router` class from the Express package and functions `signUp`, `login`, `forgotPassword`, and
`resetPassword` from the `auth.controller.js` file located in the controllers directory. */
import { Router } from 'express';
import { 
  getVideos, 
  getVideoById, 
  getPopularVideos, 
  getPeliculas,
  healthCheck 
} from '../controllers/pexels.controller.js';

const router = Router();

router.get('/', healthCheck);

router.get('/videos/popular', getPopularVideos);

router.get('/peliculas', getPeliculas);

router.get('/videos/search', getVideos);

router.get('/videos/:id', getVideoById);

export default router;  