import express from 'express'
import paymentController from '../controllers/user/payment.controller.js'

const router = express.Router()

router.post('/api/payment/credit/:id', paymentController.createCreditCardPayment)
router.post('/api/payment/pix/:id', paymentController.createPixPayment)
router.post('/api/payment/status/:id', paymentController.checkPaymentStatus)

export default router
