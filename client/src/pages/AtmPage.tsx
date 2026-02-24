import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Plus, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const atmStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待處理", variant: "secondary" },
  processing: { label: "處理中", variant: "default" },
  completed: { label: "已完成", variant: "default" },
  failed: { label: "失敗", variant: "destructive" },
};

export default function AtmPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const queryInput = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const { data, isLoading } = trpc.atm.list.useQuery(queryInput);
  const { data: cards } = trpc.cards.list.useQuery();
  const requestMutation = trpc.atm.requestWithdrawal.useMutation();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);

  const activeCards = useMemo(
    () => (cards || []).filter((c) => c.status === "active"),
    [cards]
  );

  const withdrawals = data?.records || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRequest = async () => {
    if (!selectedCardId || amount <= 0) {
      toast.error("請選擇卡片並輸入提領金額");
      return;
    }
    try {
      await requestMutation.mutateAsync({
        cardId: Number(selectedCardId),
        amount,
      });
      toast.success("ATM 提領申請已提交");
      setDialogOpen(false);
      setSelectedCardId("");
      setAmount(0);
      utils.atm.list.invalidate();
    } catch (e) {
      toast.error(`提領申請失敗: ${(e as Error).message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已複製到剪貼簿");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            ATM 提領
          </h1>
          <p className="text-muted-foreground mt-1">管理您的 ATM 提領申請</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              申請提領
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>ATM 提領申請</DialogTitle>
              <DialogDescription>選擇卡片並輸入提領金額</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>選擇卡片</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger><SelectValue placeholder="選擇卡片" /></SelectTrigger>
                  <SelectContent>
                    {activeCards.length > 0 ? (
                      activeCards.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          •••• {c.cardLast4 || "****"} — ${c.availableBalance || "0.00"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>暫無可用卡片</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>提領金額 (USD)</Label>
                <Input type="number" min={1} placeholder="100" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <Button className="w-full" onClick={handleRequest} disabled={requestMutation.isPending}>
                {requestMutation.isPending ? "提交中..." : "確認提領"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="text-center py-16">
              <Landmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">暫無提領記錄</p>
              <p className="text-sm text-muted-foreground mt-1">點擊「申請提領」開始</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">時間</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">訂單號</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">金額</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">手續費</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">激活碼</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const statusInfo = atmStatusMap[w.status] || atmStatusMap.pending;
                    return (
                      <tr key={w.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 text-sm">
                          {w.createdAt ? new Date(w.createdAt).toLocaleString("zh-TW") : "-"}
                        </td>
                        <td className="p-4 text-sm font-mono text-muted-foreground">
                          {w.merchantOrderNo || "-"}
                        </td>
                        <td className="p-4 text-sm font-semibold text-right">
                          ${w.amount}
                        </td>
                        <td className="p-4 text-sm text-right text-muted-foreground">
                          {w.fee && parseFloat(String(w.fee)) > 0 ? `$${w.fee}` : "-"}
                        </td>
                        <td className="p-4 text-center">
                          {w.activationCode ? (
                            <div className="flex items-center justify-center gap-1">
                              <code className="text-sm font-mono bg-secondary/50 px-2 py-0.5 rounded">{w.activationCode}</code>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(w.activationCode!)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
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
