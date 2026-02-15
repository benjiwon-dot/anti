"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Download, RefreshCw, Calendar, Package, ChevronRight } from "lucide-react";

import { listOrders } from "@/lib/admin/orderRepo";
import { OrderHeader, OrderStatus } from "@/lib/admin/types";

const STATUSES: (OrderStatus | "ALL")[] = [
    "ALL",
    "paid",
    "processing",
    "printed",
    "shipping",
    "delivered",
    "canceled",
    "refunded",
];

function toText(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.join("");
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try { return JSON.stringify(v); } catch { return String(v); }
}

function ymd(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function downloadCsv(filename: string, csvText: string) {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function csvEscape(s: any) {
    const v = toText(s);
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
        return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
}

export default function AdminOrderList() {
    const router = useRouter();

    const [rows, setRows] = useState<OrderHeader[]>([]);
    const [loading, setLoading] = useState(true);

    const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
    const [q, setQ] = useState("");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    const refetch = async () => {
        setLoading(true);
        try {
            const res = await listOrders({
                status,
                from: from || undefined,
                to: to || undefined,
                limit: 500,
                sort: "desc",
            });
            setRows(res.rows || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, from, to]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return rows;

        return rows.filter((r) => {
            const customer = toText(r.customer?.fullName);
            const email = toText(r.customer?.email);
            const phone = toText(r.customer?.phone);
            const orderCode = toText(r.orderCode);
            const addr1 = toText((r.shipping as any)?.address1);
            const addr2 = toText((r.shipping as any)?.address2);
            const city = toText((r.shipping as any)?.city);
            const state = toText((r.shipping as any)?.state);
            const postal = toText((r.shipping as any)?.postalCode);
            const hay = `${customer} ${email} ${phone} ${orderCode} ${addr1} ${addr2} ${city} ${state} ${postal}`.toLowerCase();
            return hay.includes(needle);
        });
    }, [rows, q]);

    const exportCsv = () => {
        const header = [
            "date",
            "orderCode",
            "status",
            "customerName",
            "email",
            "phone",
            "fullName",
            "address1",
            "address2",
            "city",
            "state",
            "postalCode",
            "country",
            "itemsCount",
            "total",
        ];

        const lines = [header.join(",")];

        for (const r of filtered) {
            const ship: any = r.shipping || {};
            const customerName = toText(r.customer?.fullName);
            const fullName = toText(ship.fullName || r.customer?.fullName);
            const email = toText(r.customer?.email || ship.email);
            const phone = toText(r.customer?.phone || ship.phone);

            const row = [
                ymd(r.createdAt),
                r.orderCode,
                r.status,
                customerName,
                email,
                phone,
                fullName,
                toText(ship.address1),
                toText(ship.address2),
                toText(ship.city),
                toText(ship.state),
                toText(ship.postalCode),
                toText(ship.country),
                String(r.itemsCount ?? 0),
                String(r.pricing?.total ?? 0),
            ].map(csvEscape);

            lines.push(row.join(","));
        }

        downloadCsv(`memotile_orders_${ymd(new Date().toISOString())}.csv`, lines.join("\n"));
    };

    return (
        <div className="min-h-[80vh] p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black">System Operations</h1>

                <div className="flex items-center gap-2">
                    <button className="admin-btn admin-btn-secondary" onClick={refetch} disabled={loading}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="mt-6 flex flex-wrap gap-2">
                {STATUSES.map((s) => {
                    const active = status === s;
                    return (
                        <button
                            key={s}
                            onClick={() => setStatus(s as any)}
                            className={
                                "px-3 py-2 rounded-full text-sm font-black border " +
                                (active ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")
                            }
                        >
                            {String(s).toUpperCase()}
                        </button>
                    );
                })}
            </div>

            {/* Search / Date / CSV */}
            <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="flex-1">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name / email / phone / orderCode / address... (1 char ok)"
                        className="admin-input w-full"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                        <Calendar size={16} /> From
                    </span>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="admin-input"
                    />
                    <span className="text-zinc-400">~</span>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="admin-input"
                    />
                </div>

                <button className="admin-btn admin-btn-secondary" onClick={exportCsv} disabled={loading}>
                    <Download size={16} /> Export CSV
                </button>
            </div>

            <div className="mt-4 text-xs text-zinc-500">
                Showing <span className="font-black">{filtered.length}</span> / {rows.length}
            </div>

            {/* Table */}
            <div className="mt-4 admin-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b">
                        <tr className="text-left">
                            <th className="p-3">Order</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Status</th>
                            <th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td className="p-6 text-zinc-500" colSpan={7}>
                                    Loading...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td className="p-6 text-zinc-500" colSpan={7}>
                                    No orders
                                </td>
                            </tr>
                        ) : (
                            filtered.map((r) => (
                                <tr key={r.id} className="border-b last:border-b-0 hover:bg-zinc-50">
                                    <td className="p-3 font-black font-mono">{r.orderCode}</td>
                                    <td className="p-3 text-zinc-600">{new Date(r.createdAt).toLocaleString()}</td>
                                    <td className="p-3">
                                        <div className="font-bold">{toText(r.customer?.fullName)}</div>
                                        <div className="text-xs text-zinc-400">{toText(r.customer?.email)}</div>
                                    </td>
                                    <td className="p-3 text-zinc-600">
                                        <span className="inline-flex items-center gap-2">
                                            <Package size={14} /> {r.itemsCount}
                                        </span>
                                    </td>
                                    <td className="p-3 font-black">
                                        ฿{Number(r.pricing?.total || 0).toLocaleString()}
                                    </td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 rounded-full text-xs font-black border bg-emerald-50 border-emerald-200 text-emerald-700">
                                            {String(r.status).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <button
                                            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-bold"
                                            onClick={() => router.push(`/admin/orders/${r.id}`)}
                                        >
                                            Detail <ChevronRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
