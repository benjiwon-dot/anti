"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
    Search,
    ChevronRight,
    RefreshCw,
    Calendar,
    Package,
    Download,
    CheckSquare,
    Square,
    FileSpreadsheet,
    Loader2,
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";

import { OrderHeader, OrderStatus } from "@/lib/admin/types";
import { listOrders } from "@/lib/admin/orderRepo";
import StatusBadge from "./StatusBadge";
import { app } from "@/lib/firebase";

const isWeb = typeof window !== "undefined";

function norm(s: any) {
    return String(s || "").toLowerCase().trim();
}

const normStatus = (s: any) => String(s ?? "").trim().toUpperCase();

const ALLOWED_STATUSES = new Set([
    "PAID",
    "PROCESSING",
    "PRINTED",
    "SHIPPING",
    "DELIVERED",
    "CANCELED",
    "REFUNDED",
]);

function toCsv(rows: Record<string, any>[]) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0] || {});
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
    return lines.join("\n");
}

function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8") {
    if (!isWeb) return;
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function browserDownloadUrl(url: string, filename?: string) {
    if (!isWeb) return;
    try {
        const a = document.createElement("a");
        a.href = url;
        if (filename) a.download = filename;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch {
        window.open(url, "_blank", "noreferrer");
    }
}

function alertCallableError(prefix: string, e: any) {
    const code = e?.code || "unknown";
    const msg = e?.message || String(e);
    const details = e?.details ? JSON.stringify(e.details) : "";
    console.error(prefix, e);
    alert(`${prefix}\ncode: ${code}\nmessage: ${msg}${details ? `\ndetails: ${details}` : ""}`);
}

export default function AdminOrderList() {
    const router = useRouter();

    const [orders, setOrders] = useState<OrderHeader[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 상단 조회용 필터
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [from, setFrom] = useState<string>("");
    const [to, setTo] = useState<string>("");

    // 하단 CSV 내보내기용 날짜 필터
    const [csvFrom, setCsvFrom] = useState<string>("");
    const [csvTo, setCsvTo] = useState<string>("");
    const [exportLoading, setExportLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const lastSigRef = useRef<string>("");
    const functions = useMemo(() => getFunctions(app, "us-central1"), []);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    // 화면 목록 조회
    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        setSelectedIds(new Set());

        try {
            const data: any = await listOrders({
                status: statusFilter !== "ALL" ? (statusFilter as OrderStatus) : undefined,
                from: from || undefined,
                to: to || undefined,
                sort: "desc",
                limit: 500,
            } as any);

            const rows: OrderHeader[] = Array.isArray(data) ? data : data?.rows ?? [];
            setOrders(rows);
        } catch (e: any) {
            console.error("[AdminOrderList] fetchOrders failed", e);
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    const visibleOrders = useMemo(() => {
        const qq = norm(q);
        const tab = normStatus(statusFilter);

        const statusFiltered = orders.filter((o) => {
            if (tab === "ALL") return true;
            const s = normStatus(o.status);
            return ALLOWED_STATUSES.has(tab) && s === tab;
        });

        if (!qq) return statusFiltered;

        return statusFiltered.filter((o) => {
            const hay = [
                o.orderCode,
                o.id,
                o.customer?.fullName,
                o.customer?.email,
                o.customer?.phone,
                o.shipping?.fullName,
                o.shipping?.phone,
                o.shipping?.email,
                o.shipping?.address1,
                o.shipping?.address2,
                o.shipping?.city,
                o.shipping?.state,
                o.shipping?.postalCode,
            ]
                .map(norm)
                .join(" | ");

            return hay.includes(qq);
        });
    }, [orders, q, statusFilter]);

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (visibleOrders.length === 0) return;
        const allVisibleSelected = visibleOrders.every(o => selectedIds.has(o.id));
        const next = new Set(selectedIds);
        if (allVisibleSelected) {
            visibleOrders.forEach(o => next.delete(o.id));
        } else {
            visibleOrders.forEach(o => next.add(o.id));
        }
        setSelectedIds(next);
    };

    const handleBulkStatus = async (newStatus: string) => {
        if (selectedIds.size === 0) return;
        if (isWeb && !window.confirm(`Update ${selectedIds.size} orders to ${newStatus}?`)) return;

        setBulkLoading(true);
        try {
            const fn = httpsCallable(functions, "adminBatchUpdateStatus");
            await fn({ orderIds: Array.from(selectedIds), status: newStatus });
            await fetchOrders();
            alert("Status updated successfully!");
        } catch (e: any) {
            alertCallableError("Bulk update failed:", e);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkZip = async () => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            const fn = httpsCallable(functions, "adminExportZipPrints");
            const res = await fn({ orderIds: Array.from(selectedIds), type: "print" });
            const { url } = (res.data as any) || {};
            if (url) {
                browserDownloadUrl(url, `Memotile_Print_${new Date().toISOString().slice(0, 10)}.zip`);
            } else {
                alert("ZIP generation returned no URL.");
            }
        } catch (e: any) {
            alertCallableError("ZIP export failed:", e);
        } finally {
            setBulkLoading(false);
        }
    };

    const generateCsvContent = (targetOrders: OrderHeader[]) => {
        const rows = targetOrders.map((o) => ({
            Date: formatDate(o.createdAt),
            OrderNo: o.orderCode,
            OrderId: o.id,
            Status: o.status,
            TileCount: o.itemsCount,
            CustomerName: o.customer?.fullName || o.shipping?.fullName || "Guest",
            Email: o.customer?.email || o.shipping?.email || "",
            Phone: o.customer?.phone || o.shipping?.phone || "",
            Address1: o.shipping?.address1 || "",
            Address2: o.shipping?.address2 || "",
            City: o.shipping?.city || "",
            State: o.shipping?.state || "",
            PostalCode: o.shipping?.postalCode || "",
            Country: o.shipping?.country || "",
            Total: o.pricing?.total ?? 0,
            Currency: o.currency || "THB",
        }));
        return toCsv(rows);
    };

    const handleExportCSV = async () => {
        if (csvFrom && csvTo) {
            setExportLoading(true);
            try {
                const data: any = await listOrders({
                    from: csvFrom,
                    to: csvTo,
                    sort: "desc",
                    limit: 1000,
                } as any);

                const rows: OrderHeader[] = Array.isArray(data) ? data : data?.rows ?? [];

                if (rows.length === 0) {
                    alert("No orders found for the selected CSV date range.");
                    return;
                }

                const csv = generateCsvContent(rows);
                downloadTextFile(`orders_${csvFrom}_to_${csvTo}.csv`, csv);

            } catch (e: any) {
                console.error("Export fetch failed", e);
                alert("Failed to fetch orders for CSV export.");
            } finally {
                setExportLoading(false);
            }
            return;
        }

        const targets = selectedIds.size > 0 ? visibleOrders.filter((o) => selectedIds.has(o.id)) : visibleOrders;

        if (targets.length === 0) {
            alert("No orders to export (Screen list is empty).");
            return;
        }

        const csv = generateCsvContent(targets);
        downloadTextFile(`orders_visible_${new Date().toISOString().slice(0, 10)}.csv`, csv);
    };

    // ✅ [추가됨] 뷰 날짜 리셋 및 리프레시 핸들러
    const handleResetView = () => {
        if (!from && !to) {
            // 이미 날짜가 없으면 강제로 fetch
            fetchOrders();
        } else {
            // 날짜를 비우면 useEffect가 감지하여 자동으로 fetchOrders 호출
            setFrom("");
            setTo("");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const sig = JSON.stringify({ status: statusFilter, from, to });
            if (lastSigRef.current === sig) return;
            lastSigRef.current = sig;
            fetchOrders();
        }, 200);

        return () => clearTimeout(timer);
    }, [statusFilter, from, to]);

    const isAllVisibleSelected = visibleOrders.length > 0 && visibleOrders.every(o => selectedIds.has(o.id));

    return (
        <div className="space-y-6">
            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto border-b pb-2">
                {["ALL", "PAID", "PROCESSING", "PRINTED", "SHIPPING", "DELIVERED", "CANCELED", "REFUNDED"].map((st) => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase ${statusFilter === st ? "bg-zinc-900 text-white" : "bg-white text-zinc-400 border"
                            }`}
                    >
                        {st}
                    </button>
                ))}
            </div>

            {/* Search + View Date Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        className="admin-input pl-10 w-full"
                        placeholder="Search by name / email / phone / orderCode / address… (1 char ok)"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                {/* View Date Range */}
                <div className="flex gap-2 items-center bg-zinc-50 p-1.5 rounded-lg border border-zinc-200">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">View:</span>
                    <input type="date" className="bg-transparent text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <span className="text-zinc-400">-</span>
                    <input type="date" className="bg-transparent text-xs" value={to} onChange={(e) => setTo(e.target.value)} />

                    {/* ✅ [수정됨] 리셋 기능이 적용된 새로고침 버튼 */}
                    <button
                        onClick={handleResetView}
                        className="admin-btn admin-btn-secondary !p-1.5"
                        disabled={loading}
                        title="Reset dates & Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Bulk Bar */}
            <div className="bg-zinc-900 text-white p-3 rounded-xl flex flex-col md:flex-row gap-3 md:justify-between md:items-center">
                <span className="font-bold">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select orders"}
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        disabled={bulkLoading || selectedIds.size === 0}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                setTimeout(() => handleBulkStatus(val), 100);
                            }
                            e.target.value = "";
                        }}
                        className={`bg-zinc-800 text-xs px-2 py-2 rounded ${selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <option value="">Set Status</option>
                        <option value="PAID">PAID</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="PRINTED">PRINTED</option>
                        <option value="SHIPPING">SHIPPING</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELED">CANCELED</option>
                        <option value="REFUNDED">REFUNDED</option>
                    </select>

                    <button
                        onClick={handleBulkZip}
                        disabled={bulkLoading || selectedIds.size === 0}
                        className={`bg-white text-zinc-900 px-3 py-2 rounded text-xs font-black inline-flex items-center gap-2 ${selectedIds.size === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <Download size={12} /> ZIP (Print)
                    </button>
                </div>
            </div>

            {/* Bottom Bar: Count & CSV Export */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-xs text-zinc-500 font-bold">
                    Showing <span className="text-zinc-900">{visibleOrders.length}</span> / {orders.length}
                </div>

                {/* CSV Date Range */}
                <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-lg shadow-sm">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase ml-1">CSV Range:</span>
                    <input
                        type="date"
                        value={csvFrom}
                        onChange={(e) => setCsvFrom(e.target.value)}
                        className="text-xs border rounded px-1 py-1"
                    />
                    <span className="text-zinc-400">-</span>
                    <input
                        type="date"
                        value={csvTo}
                        onChange={(e) => setCsvTo(e.target.value)}
                        className="text-xs border rounded px-1 py-1"
                    />

                    <button
                        onClick={handleExportCSV}
                        disabled={bulkLoading || exportLoading}
                        className="ml-2 bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-2 hover:bg-green-100 transition-colors"
                    >
                        {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="admin-card overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-zinc-50">
                            <th className="p-4">
                                <button onClick={toggleSelectAll}>
                                    {isAllVisibleSelected ? (
                                        <CheckSquare size={16} />
                                    ) : (
                                        <Square size={16} />
                                    )}
                                </button>
                            </th>
                            <th>Order</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {visibleOrders.map((order) => (
                            <tr key={order.id} className={selectedIds.has(order.id) ? "bg-blue-50" : ""}>
                                <td className="p-4">
                                    <button onClick={() => toggleSelect(order.id)}>
                                        {selectedIds.has(order.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                </td>

                                <td className="font-mono font-bold whitespace-nowrap">{order.orderCode}</td>

                                <td className="whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2 text-sm">
                                        <Calendar size={14} /> {formatDate(order.createdAt)}
                                    </span>
                                </td>

                                <td>
                                    <div className="font-bold">{order.customer?.fullName || "-"}</div>
                                    <div className="text-xs text-zinc-400">{order.customer?.email || "-"}</div>
                                    {order.customer?.phone ? <div className="text-xs text-zinc-400">{order.customer.phone}</div> : null}
                                </td>

                                <td className="whitespace-nowrap">
                                    <span className="inline-flex items-center gap-2 text-sm">
                                        <Package size={14} /> {order.itemsCount}
                                    </span>
                                </td>

                                <td className="font-black whitespace-nowrap">฿{order.pricing?.total?.toLocaleString?.() ?? "-"}</td>

                                <td>
                                    <StatusBadge status={order.status} />
                                    {order.hasPrintWarning && (
                                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-200">
                                            <span>⚠</span> Print issue
                                        </div>
                                    )}
                                </td>

                                <td>
                                    <button
                                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                                        className="inline-flex items-center"
                                        aria-label="Open order detail"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {!loading && visibleOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-zinc-400">
                                    No orders found.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {error && <p className="text-red-500 font-bold">{error}</p>}
        </div>
    );
}