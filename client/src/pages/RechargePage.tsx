import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Copy, ExternalLink, CreditCard } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function RechargePage() {
  const { data: cards, isLoading: cardsLoading } = trpc.cards.list.useQuery();
  const rechargeMutation = trpc.cards.recharge.useMutation();
  const depositMutation = trpc.wallet.getDepositAddress.useMutation();
  const utils = trpc.useUtils();

  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [rechargeAmount, setRechargeAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState("default");

  // USDT 入金
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositChain, setDepositChain] = useState("TRC20");
  const [depositInfo, setDepositInfo] = useState<any>(null);

  const activeCards = useMemo(
    () => (cards || []).filter((c) => c.status === "active" || c.status === "frozen"),
    [cards]
  );

  const handleRecharge = async () => {
    if (!selectedCardId || rechargeAmount <= 0) {
      toast.error("請選擇卡片並輸入充值金額");
      return;
    }
    try {
      await rechargeMutation.mutateAsync({
        cardId: Number(selectedCardId),
        amount: rechargeAmount,
        accountId,
      });
      toast.success("充值成功");
      setRechargeAmount(0);
      utils.cards.list.invalidate();
      utils.dashboard.summary.invalidate();
      utils.transactions.list.invalidate();
    } catch (e) {
      toast.error(`充值失敗: ${(e as Error).message}`);
    }
  };

  const handleGetDepositAddress = async () => {
    if (depositAmount <= 0) {
      toast.error("請輸入入金金額");
      return;
    }
    try {
      const result = await depositMutation.mutateAsync({
        amount: depositAmount,
        chain: depositChain,
      });
      setDepositInfo(result);
      toast.success("入金地址已生成");
    } catch (e) {
      toast.error(`獲取入金地址失敗: ${(e as Error).message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已複製到剪貼簿");
  };

  if (cardsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          充值
        </h1>
        <p className="text-muted-foreground mt-1">為您的卡片充值或獲取 USDT 入金地址</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 卡片充值 */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              卡片充值
            </CardTitle>
            <CardDescription>從商戶帳戶餘額充值到指定卡片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>選擇卡片</Label>
              <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                <SelectTrigger><SelectValue placeholder="選擇要充值的卡片" /></SelectTrigger>
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
              <Label>充值金額 (USD)</Label>
              <Input type="number" min={1} placeholder="100" value={rechargeAmount || ""} onChange={(e) => setRechargeAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>扣款帳戶 ID</Label>
              <Input placeholder="商戶帳戶 ID" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleRecharge} disabled={rechargeMutation.isPending || !selectedCardId}>
              {rechargeMutation.isPending ? "充值中..." : "確認充值"}
            </Button>
          </CardContent>
        </Card>

        {/* USDT 入金 */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              USDT 入金
            </CardTitle>
            <CardDescription>獲取鏈上入金地址，將 USDT 轉入商戶錢包</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>入金金額 (USDT)</Label>
              <Input type="number" min={1} placeholder="100" value={depositAmount || ""} onChange={(e) => setDepositAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>鏈類型</Label>
              <Select value={depositChain} onValueChange={setDepositChain}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                  <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                  <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleGetDepositAddress} disabled={depositMutation.isPending}>
              {depositMutation.isPending ? "生成中..." : "獲取入金地址"}
            </Button>

            {depositInfo && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">入金地址</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono break-all flex-1">{depositInfo.toAddress || "-"}</code>
                    {depositInfo.toAddress && (
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(depositInfo.toAddress)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">實際入金金額</p>
                    <p className="font-medium">{depositInfo.actualDepositAmount || depositAmount} USDT</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">訂單號</p>
                    <p className="font-mono text-xs">{depositInfo.orderNo || "-"}</p>
                  </div>
                  {depositInfo.expireSecond && (
                    <div>
                      <p className="text-muted-foreground">有效時間</p>
                      <p className="font-medium">{Math.floor(depositInfo.expireSecond / 60)} 分鐘</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
