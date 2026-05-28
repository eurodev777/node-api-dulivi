import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'

import routes from './routes/index.js'
import './jobs/scheduler.js'

const allowedOrigins = [
	'https://menu.dulivi.com.br',
	'https://painel.dulivi.com.br',
	'https://api.dulivi.com.br',
	'https://dulivi.com.br',
	'http://localhost:8080',
	'http://localhost:3000',
	'http://localhost:5173',
	'https://console-dulivi.vercel.app',
]

export const corsOptions = {
	origin: function (origin, callback) {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true)
		} else {
			callback(null, false)
		}
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(morgan('tiny'))
app.use(cors(corsOptions))
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: 'cross-origin' },
	}),
)

app.use(express.json())
app.use(routes)

app.use((err, req, res, next) => {
	console.error(err)
	res.status(500).json({
		error: err.message || 'Internal Server Error',
	})
})

app.use((req, res, next) => {
	console.log('AUTH:', req.headers.authorization)
	next()
})

export default app
