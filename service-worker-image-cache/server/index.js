const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 4000

let imageNetworkHits = 0
const IMAGE_DIR = path.join(__dirname, 'assets')

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})

app.get('/api/images/no-store/:filename', (req, res) => {
  imageNetworkHits += 1

  const safeFilename = path.basename(req.params.filename)
  const filePath = path.join(IMAGE_DIR, safeFilename)

  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      message: 'Image not found',
      filename: safeFilename,
    })
    return
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('X-Image-Network-Hits', String(imageNetworkHits))

  res.sendFile(filePath)
})

app.get('/api/stats', (_req, res) => {
  res.json({
    networkHits: imageNetworkHits,
    generatedAt: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})
