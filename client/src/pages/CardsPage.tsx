import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Plus, Snowflake, Sun, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "處理中", variant: "secondary" },
  active: { label: "活躍", variant: "default" },
  frozen: { label: "已凍結", variant: "destructive" },
  cancelled: { label: "已註銷", variant: "outline" },
};

export default function CardsPage() {
  const { data: cards, isLoading } = trpc.cards.list.useQuery();
  const { data: typesData } = trpc.cards.getTypes.useQuery();
  const issueMutation = trpc.cards.issue.useMutation();
  const freezeMutation = trpc.cards.freeze.useMutation();
  const unfreezeMutation = trpc.cards.unfreeze.useMutation();
  const utils = trpc.useUtils();

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    cardTypeId: "",
    amount: 0,
    accountId: "default",
  });
  const [showSensitive, setShowSensitive] = useState<Record<number, boolean>>({});

  const handleIssue = async () => {
    if (!issueForm.cardTypeId) {
      toast.error("請選擇卡片類型");
      return;
    }
    try {
      await issueMutation.mutateAsync(issueForm);
      toast.success("開卡申請已提交");
      setIssueOpen(false);
      setIssueForm({ cardTypeId: "", amount: 0, accountId: "default" });
      utils.cards.list.invalidate();
      utils.dashboard.summary.invalidate();
    } catch (e) {
      toast.error(`開卡失敗: ${(e as Error).message}`);
    }
  };

  const handleFreeze = async (cardId: number) => {
    try {
      await freezeMutation.mutateAsync({ cardId });
      toast.success("卡片已凍結");
      utils.cards.list.invalidate();
      utils.dashboard.summary.invalidate();
    } catch (e) {
      toast.error(`凍結失敗: ${(e as Error).message}`);
    }
  };

  const handleUnfreeze = async (cardId: number) => {
    try {
      await unfreezeMutation.mutateAsync({ cardId });
      toast.success("卡片已解凍");
      utils.cards.list.invalidate();
      utils.dashboard.summary.invalidate();
    } catch (e) {
      toast.error(`解凍失敗: ${(e as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const cardTypes = Array.isArray(typesData?.types) ? typesData.types : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            卡片管理
          </h1>
          <p className="text-muted-foreground mt-1">管理您的虛擬卡片</p>
        </div>
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              開卡
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>申請新卡片</DialogTitle>
              <DialogDescription>選擇卡片類型並設定初始充值金額</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>卡片類型</Label>
                <Select value={issueForm.cardTypeId} onValueChange={(v) => setIssueForm((p) => ({ ...p, cardTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="選擇卡片類型" /></SelectTrigger>
                  <SelectContent>
                    {cardTypes.length > 0 ? (
                      cardTypes.map((t: any) => (
                        <SelectItem key={t.id || t.cardTypeId} value={String(t.id || t.cardTypeId)}>
                          {t.name || t.cardTypeName || `BIN ${t.bankCardBin}`} - {t.bankCardBin || ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default-type">預設卡片類型</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>初始充值金額 (USD)</Label>
                <Input type="number" min={0} placeholder="0" value={issueForm.amount || ""} onChange={(e) => setIssueForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>扣款帳戶 ID</Label>
                <Input placeholder="商戶帳戶 ID" value={issueForm.accountId} onChange={(e) => setIssueForm((p) => ({ ...p, accountId: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleIssue} disabled={issueMutation.isPending}>
                {issueMutation.isPending ? "處理中..." : "確認開卡"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 卡片列表 */}
      {!cards || cards.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">您尚未擁有任何卡片</p>
            <p className="text-sm text-muted-foreground mt-1">點擊「開卡」按鈕申請您的第一張虛擬卡</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const status = statusMap[card.status] || statusMap.pending;
            return (
              <Card key={card.id} className="bg-card overflow-hidden">
                {/* 卡片視覺化頂部 */}
                <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs text-muted-foreground">{card.cardBin || "VISA"}</span>
                  </div>
                  <div>
                    <p className="text-lg font-mono tracking-wider text-foreground">
                      •••• •••• •••• {card.cardLast4 || "****"}
                    </p>
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">可用餘額</p>
                      <p className="text-xl font-bold">${card.availableBalance || "0.00"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">類型</p>
                      <p className="text-sm font-medium">{card.cardTypeName || card.cardTypeId || "-"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {card.status === "active" && (
                      <Button variant="outline" size="sm" onClick={() => handleFreeze(card.id)} disabled={freezeMutation.isPending}>
                        <Snowflake className="h-3 w-3 mr-1" />
                        凍結
                      </Button>
                    )}
                    {card.status === "frozen" && (
                      <Button variant="outline" size="sm" onClick={() => handleUnfreeze(card.id)} disabled={unfreezeMutation.isPending}>
                        <Sun className="h-3 w-3 mr-1" />
                        解凍
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setShowSensitive((p) => ({ ...p, [card.id]: !p[card.id] }))}>
                      {showSensitive[card.id] ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      {showSensitive[card.id] ? "隱藏" : "卡片資訊"}
                    </Button>
                  </div>
                  {showSensitive[card.id] && (
                    <CardSensitiveInfo cardId={card.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardSensitiveInfo({ cardId }: { cardId: number }) {
  const { data, isLoading, error } = trpc.cards.getSensitiveInfo.useQuery({ cardId });

  if (isLoading) return <div className="mt-3 p-3 bg-secondary/50 rounded-lg"><Skeleton className="h-4 w-full" /></div>;
  if (error) return <div className="mt-3 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">無法獲取卡片資訊: {error.message}</div>;

  return (
    <div className="mt-3 p-3 bg-secondary/50 rounded-lg text-sm space-y-1">
      <p><span className="text-muted-foreground">卡號:</span> <span className="font-mono">{(data as any)?.cardNo || "****"}</span></p>
      <p><span className="text-muted-foreground">CVV:</span> <span className="font-mono">{(data as any)?.cvv || "***"}</span></p>
      <p><span className="text-muted-foreground">有效期:</span> <span className="font-mono">{(data as any)?.expireDate || "**/**"}</span></p>
    </div>
  );
}
