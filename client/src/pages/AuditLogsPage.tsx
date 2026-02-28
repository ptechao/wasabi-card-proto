import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const actionTypeLabels: Record<string, string> = {
  submit: "提交",
  approve: "批准",
  reject: "拒絕",
  resubmit: "重新提交",
};

const actionTypeColors: Record<string, string> = {
  submit: "bg-blue-100 text-blue-800",
  approve: "bg-green-100 text-green-800",
  reject: "bg-red-100 text-red-800",
  resubmit: "bg-yellow-100 text-yellow-800",
};

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filterKycId, setFilterKycId] = useState<string>("");
  const [showStatistics, setShowStatistics] = useState(false);

  // 獲取審核日誌
  const { data: logsData, isLoading: logsLoading } = trpc.admin.auditLogs.list.useQuery({
    kycId: filterKycId ? parseInt(filterKycId) : undefined,
    page,
    pageSize: 20,
  });

  // 獲取統計數據
  const { data: statsData, isLoading: statsLoading } = trpc.admin.auditLogs.statistics.useQuery(
    undefined,
    { enabled: showStatistics }
  );

  // 獲取審核者績效
  const { data: performanceData, isLoading: performanceLoading } = trpc.admin.auditLogs.reviewerPerformance.useQuery(
    { page: 1, pageSize: 10 },
    { enabled: showStatistics }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">審核日誌</h1>
        <Button
          variant={showStatistics ? "default" : "outline"}
          onClick={() => setShowStatistics(!showStatistics)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {showStatistics ? "隱藏統計" : "顯示統計"}
        </Button>
      </div>

      {/* 統計儀表板 */}
      {showStatistics && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* KYC 統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">KYC 審核統計</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : statsData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">總申請數</span>
                    <span className="font-bold text-lg">{statsData.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">待審核</span>
                    <span className="font-bold text-lg text-yellow-600">{statsData.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">已提交</span>
                    <span className="font-bold text-lg text-blue-600">{statsData.submitted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">已批准</span>
                    <span className="font-bold text-lg text-green-600">{statsData.approved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">已拒絕</span>
                    <span className="font-bold text-lg text-red-600">{statsData.rejected}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground font-medium">批准率</span>
                    <span className="font-bold text-lg">{statsData.approvalRate}%</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* 審核者績效 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">審核者績效排名</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : performanceData && performanceData.records.length > 0 ? (
                <div className="space-y-3">
                  {performanceData.records.map((reviewer: any, idx: number) => (
                    <div key={reviewer.operatorId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">#{idx + 1} {reviewer.operatorName}</p>
                        <p className="text-xs text-muted-foreground">
                          批准: {reviewer.approvals || 0} | 拒絕: {reviewer.rejections || 0}
                        </p>
                      </div>
                      <Badge variant="outline">{reviewer.approvalRate}%</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">暫無數據</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 審核日誌列表 */}
      <Card>
        <CardHeader>
          <CardTitle>審核日誌列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 篩選 */}
          <div className="flex gap-2">
            <Input
              placeholder="輸入 KYC ID 篩選..."
              value={filterKycId}
              onChange={(e) => {
                setFilterKycId(e.target.value);
                setPage(1);
              }}
              type="number"
              className="max-w-xs"
            />
            {filterKycId && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterKycId("");
                  setPage(1);
                }}
              >
                清除篩選
              </Button>
            )}
          </div>

          {/* 表格 */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KYC ID</TableHead>
                      <TableHead>操作者</TableHead>
                      <TableHead>操作類型</TableHead>
                      <TableHead>狀態變更</TableHead>
                      <TableHead>備註</TableHead>
                      <TableHead>操作時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.records && logsData.records.length > 0 ? (
                      logsData.records.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.kycId}</TableCell>
                          <TableCell>{log.operatorName || `User ${log.operatorId}`}</TableCell>
                          <TableCell>
                            <Badge className={actionTypeColors[log.actionType]}>
                              {actionTypeLabels[log.actionType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.previousStatus && (
                              <>
                                <span className="text-muted-foreground">{log.previousStatus}</span>
                                <span className="mx-1">→</span>
                              </>
                            )}
                            <span className="font-medium">{log.newStatus}</span>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs truncate">
                            {log.notes || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          沒有找到審核日誌
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁 */}
              {logsData && logsData.total > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    共 {logsData.total} 條記錄，第 {page} 頁
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={!logsData.records || logsData.records.length < 20}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
