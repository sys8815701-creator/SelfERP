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