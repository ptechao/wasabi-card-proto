import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownUp, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

const txTypeMap: Record<string, { label: string; color: string }> = {
  deposit: { label: "充值", color: "text-green-500" },
  withdrawal: { label: "提領", color: "text-orange-400" },
  purchase: { label: "消費", color: "text-red-400" },
  refund: { label: "退款", color: "text-blue-400" },
  fee: { label: "手續費", color: "text-yellow-500" },
  create: { label: "開卡", color: "text-purple-400" },
};

const txStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "處理中", variant: "secondary" },
  success: { label: "成功", variant: "default" },
  failed: { label: "失敗", variant: "destructive" },
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [cardFilter, setCardFilter] = useState<string>("all");
  const pageSize = 20;

  const queryInput = useMemo(() => ({
    page,
    pageSize,
    ...(cardFilter !== "all" ? { cardId: Number(cardFilter) } : {}),
  }), [page, pageSize, cardFilter]);

  const { data, isLoading } = trpc.transactions.list.useQuery(queryInput);
  const { data: cards } = trpc.cards.list.useQuery();

  const transactions = data?.records || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowDownUp className="h-6 w-6 text-primary" />
            交易記錄
          </h1>
          <p className="text-muted-foreground mt-1">查看所有卡片的交易明細</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={cardFilter} onValueChange={(v) => { setCardFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="篩選卡片" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有卡片</SelectItem>
              {(cards || []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  •••• {c.cardLast4 || "****"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">暫無交易記錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">時間</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">類型</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">描述</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">金額</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">手續費</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const typeInfo = txTypeMap[tx.type] || { label: tx.type, color: "text-foreground" };
                    const statusInfo = txStatusMap[tx.status] || txStatusMap.pending;
                    const isPositive = tx.type === "deposit" || tx.type === "refund";
                    return (
                      <tr key={tx.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-sm">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString("zh-TW") : "-"}
                        </td>
                        <td className="p-4">
                          <span className={`text-sm font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                          {tx.description || tx.merchantName || "-"}
                        </td>
                        <td className={`p-4 text-sm font-semibold text-right ${isPositive ? "text-green-500" : "text-red-400"}`}>
                          {isPositive ? "+" : "-"}${tx.amount}
                        </td>
                        <td className="p-4 text-sm text-right text-muted-foreground">
                          {tx.fee && parseFloat(String(tx.fee)) > 0 ? `$${tx.fee}` : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                共 {total} 筆記錄，第 {page}/{totalPages} 頁
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
