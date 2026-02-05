import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    Download,
    FileJson,
    MapPin,
    User,
    CreditCard,
    Image as ImageIcon,
    ExternalLink,
    Loader2,
    Package
} from 'lucide-react-native';
import { OrderDetail } from '@/lib/admin/types';
import { getOrderDetail } from '@/lib/admin/orderRepo';
import StatusBadge from './StatusBadge';

export default function AdminOrderDetail({ orderId }: { orderId: string }) {
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [zipLoading, setZipLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const data = await getOrderDetail(orderId);
                setOrder(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [orderId]);

    const handleDownloadZip = async () => {
        setZipLoading(true);
        try {
            // TODO: In production, trigger a Firebase Cloud Function to generate the ZIP.
            // Current code is a placeholder for the flow.
            throw new Error("Cloud Function for ZIP not implemented yet.");
        } catch (err) {
            alert("ZIP Download error: Cloud Function needed");
        } finally {
            setZipLoading(false);
        }
    };

    const handleExportJson = async () => {
        try {
            // TODO: In production, trigger a Firebase Cloud Function to generate the JSON.
            throw new Error("Cloud Function for JSON not implemented yet.");
        } catch (err) {
            alert("JSON Export error: Cloud Function needed");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={40} color="#007AFF" />
                <p className="text-zinc-500 font-medium">Fetching order operations data...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-20">
                <p className="text-rose-500 font-bold text-xl mb-4">Error loading order</p>
                <p className="text-zinc-500 mb-8">{error || "Order not found"}</p>
                <button onClick={() => router.back()} className="admin-btn admin-btn-secondary mx-auto">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="admin-btn admin-btn-secondary !p-2">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-zinc-900 font-mono">{order.orderCode}</h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-zinc-400 text-sm font-mono uppercase tracking-tighter">{order.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportJson}
                        className="admin-btn admin-btn-secondary"
                    >
                        <FileJson size={18} />
                        <span>Export Printer JSON</span>
                    </button>
                    <button
                        onClick={handleDownloadZip}
                        disabled={zipLoading}
                        className="admin-btn admin-btn-primary"
                    >
                        {zipLoading ? <Loader2 size={18} color="#fff" /> : <Download size={18} />}
                        <span>Download All Prints (ZIP)</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Info Cards */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Customer */}
                    <section className="admin-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-100 pb-3 mb-1">
                            <User size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">Customer</h3>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-zinc-900 leading-tight">{order.customer.fullName}</p>
                            <p className="text-zinc-400 text-sm">{order.customer.email}</p>
                            <p className="text-zinc-400 text-sm">{order.customer.phone}</p>
                        </div>
                    </section>

                    {/* Shipping */}
                    <section className="admin-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-100 pb-3 mb-1">
                            <MapPin size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">Shipping Address</h3>
                        </div>
                        <div className="space-y-1">
                            <p className="text-zinc-800 font-bold">{order.shipping.fullName}</p>
                            <p className="text-zinc-500 text-sm whitespace-pre-wrap leading-relaxed">
                                {order.shipping.address1}{order.shipping.address2 ? `\n${order.shipping.address2}` : ''}
                            </p>
                            <p className="text-zinc-500 text-sm">{order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}</p>
                            <p className="text-zinc-900 font-black pt-2 flex items-center gap-1">
                                <span className="text-xs text-zinc-400 uppercase tracking-tighter">Country:</span>
                                {order.shipping.country}
                            </p>
                        </div>
                    </section>

                    {/* Payment */}
                    <section className="admin-card p-6 space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-100 pb-3 mb-1">
                            <CreditCard size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">Payment & Totals</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-zinc-400">Method:</span>
                                <span className="text-zinc-700 font-bold text-right">{order.payment.provider} ({order.payment.method})</span>
                                <span className="text-zinc-400">Subtotal:</span>
                                <span className="text-zinc-600 text-right">฿{order.pricing.subtotal.toLocaleString()}</span>
                                {order.pricing.discount > 0 && (
                                    <>
                                        <span className="text-rose-500">Discount:</span>
                                        <span className="text-rose-500 text-right">-฿{order.pricing.discount.toLocaleString()}</span>
                                    </>
                                )}
                                <span className="text-zinc-400">Shipping:</span>
                                <span className="text-zinc-600 text-right">฿{order.pricing.shippingFee.toLocaleString()}</span>
                            </div>
                            <div className="pt-3 border-t border-zinc-100 flex justify-between items-end">
                                <span className="text-zinc-400 font-black uppercase text-[10px]">Grand Total</span>
                                <span className="text-3xl font-black text-zinc-900">฿{order.pricing.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Col: Items List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Package size={18} />
                            <h3 className="text-xs font-black uppercase tracking-widest">Order Items ({order.items.length})</h3>
                        </div>
                        <div className="text-[10px] text-zinc-300 font-mono tracking-tighter">{order.storageBasePath || "legacy storage"}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="admin-card border border-zinc-100 bg-white p-1 flex flex-col shadow-sm">
                                <div className="relative aspect-square rounded-t-[10px] overflow-hidden bg-zinc-50">
                                    {item.assets.previewUrl ? (
                                        <img
                                            src={item.assets.previewUrl}
                                            className="w-full h-full object-cover"
                                            alt={`Item ${idx}`}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-300">
                                            <ImageIcon size={40} strokeWidth={1} />
                                            <span className="text-[10px] uppercase font-bold">No Preview Available</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-accent border border-accent/20">#{idx + 1}</div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-sm font-black text-zinc-900 capitalize">{item.filterId} Filter</p>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mt-1">{item.size} // Qty: {item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-zinc-900">฿{item.lineTotal.toLocaleString()}</p>
                                            <p className="text-[10px] text-zinc-400 font-bold">฿{item.unitPrice} ea</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {item.assets.printUrl && (
                                            <a
                                                href={item.assets.printUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 admin-btn admin-btn-secondary !text-[10px] !py-1 justify-center"
                                            >
                                                <ExternalLink size={12} /> View Full Print
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
