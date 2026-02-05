import React, { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import {
    Search,
    Filter,
    ChevronRight,
    AlertCircle,
    RefreshCw,
    Calendar,
    Package
} from 'lucide-react-native';
import { OrderHeader, OrderStatus } from '@/lib/admin/types';
import { listOrders } from '@/lib/admin/orderRepo';
import StatusBadge from './StatusBadge';

export default function AdminOrderList() {
    const [orders, setOrders] = useState<OrderHeader[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<string>('ALL');

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listOrders({
                q: q.trim() || undefined,
                status: status !== 'ALL' ? status as OrderStatus : undefined,
            });
            setOrders(data.rows || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(timer);
    }, [q, status]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Order Code..."
                        className="admin-input pl-10 w-full"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
                        <Filter size={16} color="#71717a" />
                        <select
                            className="bg-transparent text-sm font-bold text-zinc-600 focus:outline-none cursor-pointer"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="processing">Processing</option>
                            <option value="printed">Printed</option>
                            <option value="shipping">Shipping</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchOrders}
                        className="admin-btn admin-btn-secondary h-10 w-10 !p-0 justify-center"
                    >
                        <RefreshCw size={18} color={loading ? '#007AFF' : '#71717a'} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="admin-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Order</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Items</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading && orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                        Loading records...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                        No orders found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-zinc-900 font-mono">{order.orderCode}</span>
                                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{order.id.slice(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <Calendar size={14} color="#a1a1aa" />
                                                <span className="text-sm">{formatDate(order.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-800">{order.customer.fullName}</span>
                                                <span className="text-xs text-zinc-400">{order.customer.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <Package size={14} color="#a1a1aa" />
                                                <span className="text-sm font-bold">{order.itemsCount} tiles</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-zinc-900">฿{order.pricing.total.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/admin/orders/${order.id}`} asChild>
                                                <button className="text-zinc-600 hover:text-accent transition-colors">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
