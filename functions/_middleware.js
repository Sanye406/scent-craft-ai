import express from 'express'
import cors from 'cors'
const app = express()

// 跨域，解决前端调用接口跨域报错
app.use(cors())
app.use(express.json())
// 静态图片托管
app.use('/images', express.static('images'))

// 【重点】把你 server.js 里所有接口、页面路由全部复制粘贴到这里
// 示例：
// app.get('/', (req, res) => res.sendFile('index.html'))
// app.get('/api/data', (req, res) => res.json({code:200}))

export default app
