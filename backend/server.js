import express from "express"
import cors from 'cors'
import 'dotenv/config'
import http from 'http' // Step 1: Import http
import { Server } from "socket.io" // Step 2: Import Socket.io
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import reportRouter from "./routes/reportRoute.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// Step 3: Create HTTP Server
const server = http.createServer(app)

// Step 4: Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Patient & Admin/Doctor URLs
    methods: ["GET", "POST"]
  }
})

// Step 5: Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a room
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
        console.log(`${userId} joined room ${roomId}`);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    // WebRTC signaling
    socket.on('offer', (offer, roomId) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', (answer, roomId) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate, roomId) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });
});


// Step 6: Export 'io' so controllers can use it
export { io }

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)
app.use("/api/report", reportRouter)

app.get("/", (req, res) => {
  res.send("API Working")
});

// Step 7: Listen using 'server', not 'app'
if (!process.env.VERCEL) {
  server.listen(port, () => console.log(`Server started on PORT:${port}`))
}

export default app