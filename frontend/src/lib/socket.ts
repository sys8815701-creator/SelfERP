import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000", {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;