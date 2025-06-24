import { Server } from "socket.io";
import http from "http";
import express from "express";

export const app = express();

export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*", 
    credentials: true,
  },
});


io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});