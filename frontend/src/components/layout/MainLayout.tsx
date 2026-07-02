import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <Header />
      <main className="ml-52 pt-14 min-h-screen">
        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
}