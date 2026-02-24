import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  DollarSign,
  ShieldCheck,
  Snowflake,
  ArrowDownUp,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";

const kycStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  none: { label: "未申請", variant: "outline" },
  pending: { label: "待提交", variant: "secondary" },
  submitted: { label: "審核中", variant: "default" },
  approved: { label: "已通過", variant: "default" },
  rejected: { label: "已拒絕", variant: "destructive" },
};

const txTypeMap: Record<string, string> = {
  deposit: "充值",
  withdrawal: "提領",
  purchase: "消費",
  refund: "退款",
  fee: "手續費",
  create: "開卡",
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const kycStatusValue = summary?.kycStatus ?? "none";
  const kycInfo = kycStatusMap[kycStatusValue] || kycStatusMap.none;

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          歡迎回來，{user?.name || "用戶"}
        </h1>
        <p className="text-muted-foreground mt-1">
          管理您的虛擬卡片與資金
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors bg-card"
          onClick={() => setLocation("/cards")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總餘額
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.totalBalance || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">USD</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors bg-card"
          onClick={() => setLocation("/cards")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              活躍卡片
            </CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.activeCards || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {summary?.totalCards || 0} 張卡片
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors bg-card"
          onClick={() => setLocation("/kyc")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              KYC 狀態
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Badge variant={kycInfo.variant} className="text-sm">
              {kycInfo.label}
            </Badge>
            {kycStatusValue === "none" && (
              <p className="text-xs text-muted-foreground mt-2">
                請先完成身份認證
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              凍結卡片
            </CardTitle>
            <Snowflake className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.frozenCards || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">張</p>
          </CardContent>
        </Card>
      </div>

      {/* 最近交易 */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            最近交易
          </CardTitle>
          <button
            onClick={() => setLocation("/transactions")}
            className="text-sm text-primary hover:underline"
          >
            查看全部
          </button>
        </CardHeader>
        <CardContent>
          {!summary?.recentTransactions ||
          summary.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>暫無交易記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        tx.type === "deposit" || tx.type === "refund"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      <ArrowDownUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {txTypeMap[tx.type] || tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || tx.merchantName || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "deposit" || tx.type === "refund"
                          ? "text-green-500"
                          : "text-red-400"
                      }`}
                    >
                      {tx.type === "deposit" || tx.type === "refund"
                        ? "+"
                        : "-"}
                      ${tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
