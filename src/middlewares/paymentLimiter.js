import rateLimit from 'express-rate-limit'

export const paymentLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,

	message: {
		success: false,
		error: 'Muitas tentativas. Tente novamente mais tarde.',
	},

	standardHeaders: true,
	legacyHeaders: false,
})
