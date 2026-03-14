import express from 'express'
// Store
import storeRoutes from './store.routes.js'
import openingHoursRoutes from './openingHour.routes.js'
import storeDayRoutes from './storeDay.routes.js'
import cityRoutes from './city.routes.js'
import deliveryAreaRoutes from './deliveryArea.routes.js'
import categoryRoutes from './category.routes.js'
import productRoutes from './product.routes.js'
import complementRoutes from './complement.routes.js'
import complementGroupRoutes from './complementGroup.routes.js'
import complementGroupComplementsRoutes from './complementGroupComplements.routes.js'
import complementGroupProductsRoutes from './complementGroupProducts.routes.js'
// User
import userRoutes from './user.routes.js'
import sessionRoutes from './auth.routes.js'
import paymentRoutes from './payment.routes.js'
import orderRoutes from './order.routes.js'
// Message
import contactRoutes from './contact.routes.js'
import groupRoutes from './group.routes.js'
import contactGroupRoutes from './contactGroup.routes.js'
import messageRoutes from './message.routes.js'
// External APIs Services
import ibgeRoutes from './ibge.routes.js'
import mercadoPagoRoutes from './mercadoPago.routes.js'
// Plan
import planRoutes from './plan.routes.js'
// Subscription
import subscriptionRoutes from './subscription.routes.js'
// Upload Image
import { multerMiddleware, uploadImage } from '../utils/uploadImage.js'
import { JWT_SECRET } from '../config/env.js'
import processScheduledMessages from '../jobs/scheduler.js'

const router = express.Router()

router.post('/api/upload', multerMiddleware, uploadImage)
// cron.job ping
router.get('/api/process-scheduled-messages', async (req, res) => {
	try {
		// Valida um token secreto simples
		const secret = req.query.token
		if (secret !== JWT_SECRET) {
			return res.status(403).json({ error: 'Acesso negado' })
		}

		await processScheduledMessages()
		res.json({ success: true, message: 'Mensagens processadas com sucesso' })
	} catch (error) {
		console.error('Erro ao processar disparos:', error)
		res.status(500).json({ error: 'Erro interno ao processar mensagens' })
	}
})
// Store
router.use(storeRoutes)
router.use(openingHoursRoutes)
router.use(storeDayRoutes)
router.use(cityRoutes)
router.use(deliveryAreaRoutes)
router.use(categoryRoutes)
router.use(productRoutes)
router.use(complementRoutes)
router.use(complementGroupRoutes)
router.use(complementGroupComplementsRoutes)
router.use(complementGroupProductsRoutes)
// User
router.use(userRoutes)
router.use(sessionRoutes)
router.use(orderRoutes)
router.use(paymentRoutes)
// Message
router.use(contactRoutes)
router.use(groupRoutes)
router.use(contactGroupRoutes)
router.use(messageRoutes)
// External APIs Services
router.use(ibgeRoutes)
router.use(mercadoPagoRoutes)
// Plan
router.use(planRoutes)
router.use(subscriptionRoutes)

router.head('/api/health', (req, res) => {
	res.sendStatus(204);
});

export default router
