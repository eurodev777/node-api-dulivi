// src/controllers/UploadController.js
import multer from 'multer'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

import supabase from '../lib/supabase.js'

const upload = multer({ storage: multer.memoryStorage() })

// Middleware para o multer (vai ser usado na rota)
export const multerMiddleware = upload.single('image')

// Função controller que faz o upload para o Supabase
export const uploadImage = async (req, res) => {
	try {
		const { buffer, mimetype } = req.file

		// Gera um nome único para o arquivo com base na data atual e UUID
		const timestamp = new Date().toISOString().replace(/[-:T.]/g, '')
		const uniqueId = uuidv4()

		// Defina a extensão desejada (por exemplo, .webp)
		const desiredExtension = '.webp'

		// Se o arquivo não for WebP, converta
		let convertedBuffer = buffer
		let fileExtension = desiredExtension

		if (mimetype !== 'image/webp') {
			// Converte a imagem para WebP
			convertedBuffer = await sharp(buffer)
				.toFormat('webp')
				.webp({ quality: 50 }) // Aqui você pode ajustar a qualidade da conversão
				.toBuffer()
		}

		const newFileName = `${timestamp}_${uniqueId}${fileExtension}`

		const { data, error } = await supabase.storage
			.from('dulivi')
			.upload(`cardapio/${newFileName}`, convertedBuffer, {
				contentType: 'image/webp', // Defina o tipo como WebP
			})

		if (error) {
			console.error(error)
			return res.status(500).send(error.message)
		}

		const url = supabase.storage.from('dulivi').getPublicUrl(`cardapio/${newFileName}`).data.publicUrl

		res.send({ url })
	} catch (error) {
		console.error(error)
		res.status(500).send('Erro ao fazer upload da imagem.')
	}
}
