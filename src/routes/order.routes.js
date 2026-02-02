import express from 'express'
import authToken from '../middlewares/authToken.js'
import orderController from '../controllers/user/order.controller.js'

const router = express.Router()

router.post('/api/order/create', orderController.create)
router.get('/api/order/all', authToken, orderController.getAll)
router.get('/api/order/:id', orderController.getById)
router.put('/api/order/update/:id', authToken, orderController.update)
router.delete('/api/order/delete/:id', authToken, orderController.delete)
router.post('/api/cart/resolve', orderController.resolve)

export default router
