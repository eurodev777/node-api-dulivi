
import multer from 'multer'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

import supabase from '../lib/supabase.js'

const upload = multer({
  storage: multer.memoryStorage()
})

// Mantém o mesmo middleware
export const multerMiddleware = upload.single('imagem')

// Mantém a mesma função de upload
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Nenhuma imagem enviada.')
    }

    const { buffer, mimetype } = req.file

    // Gera nome único
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')

    const uniqueId = uuidv4()
    const newFileName = `${timestamp}_${uniqueId}.webp`

    // Converte para WebP quando necessário
    let convertedBuffer = buffer

    if (mimetype !== 'image/webp') {
      convertedBuffer = await sharp(buffer)
        .webp({ quality: 70 })
        .toBuffer()
    }

    // Bucket e pasta corretos do Supabase
    const bucket = 'images'
    const filePath = `pizzas/${newFileName}`

    // Envia a imagem
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, convertedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('ERRO UPLOAD SUPABASE:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      })

      return res.status(500).send(error.message)
    }

    // Gera URL pública no bucket correto
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const url = data.publicUrl

    // MESMA RESPOSTA QUE SEU FRONTEND JÁ UTILIZA
    return res.send({ url })

  } catch (error) {
    console.error('ERRO AO FAZER UPLOAD:', error)

    return res.status(500).send(
      'Erro ao fazer upload da imagem.'
    )
  }
}
