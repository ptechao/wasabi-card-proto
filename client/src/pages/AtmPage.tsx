import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Landmark, Copy, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
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
  const utils = trpc.useUtils();

  const [showCode, setShowCode] = useState<Record<number, boolean>>({});

  const withdrawals = data?.records || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          ATM 提領管理
        </h1>
        <p className="text-muted-foreground mt-1">查看和管理您的 ATM 提領激活碼</p>
      </div>

      {/* 提領密碼說明卡片 */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-base">提領激活碼說明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• 激活碼是您在 ATM 機器上提領現金時所需的密碼</p>
          <p>• 每次提領申請系統會自動生成一個激活碼</p>
          <p>• 激活碼通常在提領申請提交後 24 小時內生成</p>
          <p>• 點擊複製按鈕可快速複製激活碼到剪貼簿</p>
        </CardContent>
      </Card>

      {/* 提領記錄表格 */}
      <Card className="bg-card">
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="text-center py-16">
              <Landmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">暫無提領記錄</p>
              <p className="text-sm text-muted-foreground mt-1">您的 ATM 提領申請將在此顯示</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">申請時間</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">訂單號</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">金額</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">激活碼</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const statusInfo = atmStatusMap[w.status] || atmStatusMap.pending;
                    const isCodeVisible = showCode[w.id];
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
                        <td className="p-4 text-center">
                          {w.activationCode ? (
                            <div className="flex items-center justify-center gap-2">
                              <code className={`text-sm font-mono px-2 py-1 rounded transition-all ${
                                isCodeVisible 
                                  ? "bg-secondary/50" 
                                  : "bg-secondary/30"
                              }`}>
                                {isCodeVisible ? w.activationCode : "••••••"}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0" 
                                onClick={() => setShowCode((p) => ({ ...p, [w.id]: !p[w.id] }))}
                              >
                                {isCodeVisible ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0" 
                                onClick={() => copyToClipboard(w.activationCode!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {w.status === "pending" ? "待生成" : "-"}
                            </span>
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
