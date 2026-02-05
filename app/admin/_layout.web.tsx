import { Slot } from "expo-router";
import "../../src/styles/admin.css";

export default function AdminLayout() {
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col font-sans transition-colors duration-300">
            <header className="h-16 border-b border-zinc-200 flex items-center px-8 bg-white sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center font-black text-white">M</div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900">Memotile Admin</h1>
                </div>
                <div className="ml-auto flex items-center gap-6">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest bg-zinc-100 px-2 py-1 rounded">v1.3 // LIGHT</span>
                </div>
            </header>
            <main className="flex-1 p-8">
                <Slot />
            </main>
            <footer className="p-8 border-t border-zinc-200 text-zinc-400 text-xs flex justify-between bg-white">
                <p>© 2026 Kangkook Lab. All rights reserved.</p>
                <p>Operational Dashboard</p>
            </footer>
        </div>
    );
}
