import express from 'express'
import storeController from '../controllers/store/store.controller.js'
import authToken from '../middlewares/authToken.js'

const router = express.Router()

router.post('/api/store/create', storeController.create)
router.post('/api/store/login', storeController.login)
router.get('/api/store/:id', storeController.getById)
router.get('/api/store/slug/:slug', storeController.getBySlug)
router.put('/api/store/update/:id', authToken, storeController.update)
router.get('/api/store/public/:slug', storeController.getPublicBySlug)
router.get('/api/store/status/:fk_store_id', storeController.getStoreStatus)

export default router
