import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000", {
  transports: ["websocket"],
  autoConnect: true,
});

// 백엔드가 사업장 단위로만 emit하므로(routers/expense.py), 접속 시 반드시 현재
// 사업장 room에 join해야 해당 사업장 이벤트를 받을 수 있다.
export function joinBusinessRoom(businessId: string | number) {
  socket.emit("join", { business_id: businessId });
}

export default socket;