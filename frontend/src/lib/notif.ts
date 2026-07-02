export interface NotifItem {
  id: number;
  text: string;
  link: string;
  dot: string;
  createdAt: number;
}

function getKey(): string {
  try { return `bk-notifs-${JSON.parse(localStorage.getItem("user") || "{}").id || "guest"}`; }
  catch { return "bk-notifs-guest"; }
}

export function getNotifs(): NotifItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(getKey()) || "[]"); }
  catch { return []; }
}

export function addNotif(text: string, link: string, dot = "var(--accent)") {
  const item: NotifItem = { id: Date.now(), text, link, dot, createdAt: Date.now() };
  const updated = [item, ...getNotifs()].slice(0, 50);
  localStorage.setItem(getKey(), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notif-added"));
}

export function deleteNotifById(id: number) {
  const updated = getNotifs().filter(n => n.id !== id);
  localStorage.setItem(getKey(), JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notif-added"));
}

export function clearNotifs() {
  localStorage.setItem(getKey(), JSON.stringify([]));
  window.dispatchEvent(new CustomEvent("notif-added"));
}

export function formatNotifTime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
