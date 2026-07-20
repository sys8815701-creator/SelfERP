import socketio

# Socket.IO 서버 생성
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# 연결 이벤트
@sio.event
async def connect(sid, environ):
    print(f"클라이언트 연결: {sid}")

# 연결 해제 이벤트
@sio.event
async def disconnect(sid):
    print(f"클라이언트 연결 해제: {sid}")

# 사업장별 room 입장 — 이 room으로 emit해야 다른 사업장 사용자에게
# 알림이 새어나가지 않는다 (routers/expense.py의 승인/반려 이벤트가 사용)
@sio.event
async def join(sid, data):
    business_id = (data or {}).get("business_id")
    if business_id:
        await sio.enter_room(sid, f"business_{business_id}")