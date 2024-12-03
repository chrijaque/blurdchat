import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { DatabaseService } from '@/lib/db';
import type { Report } from '@/types';
import { useRouter } from 'next/router';

// Liste over admin UIDs - dette bør flyttes til en sikker konfiguration
const ADMIN_UIDS = ['admin1', 'admin2'];

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<(Report & { reporterName: string; reportedName: string })[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !ADMIN_UIDS.includes(user.uid))) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && ADMIN_UIDS.includes(user.uid)) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      const reportsList = await DatabaseService.getReports();
      const reportsWithNames = await Promise.all(
        reportsList.map(async (report) => {
          const [reporter, reported] = await Promise.all([
            DatabaseService.getUserProfile(report.reporterId),
            DatabaseService.getUserProfile(report.reportedId)
          ]);

          return {
            ...report,
            reporterName: reporter?.username || 'Ukendt',
            reportedName: reported?.username || 'Ukendt'
          };
        })
      );

      setReports(reportsWithNames);
    } catch (error) {
      console.error('Fejl ved indlæsning af rapporter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: Report['status']) => {
    try {
      await DatabaseService.updateReportStatus(reportId, status);
      await loadReports();
    } catch (error) {
      console.error('Fejl ved opdatering af rapport status:', error);
    }
  };

  const filteredReports = reports.filter(report => 
    selectedStatus === 'all' || report.status === selectedStatus
  );

  if (loading || !user || !ADMIN_UIDS.includes(user.uid)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Indlæser...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Rapporter</h1>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="all">Alle</option>
            <option value="pending">Afventer</option>
            <option value="reviewed">Gennemgået</option>
            <option value="resolved">Løst</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Indlæser rapporter...</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8">Ingen rapporter fundet</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rapporteret af
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rapporteret bruger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handling
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {report.reporterName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {report.reportedName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <p className="font-medium">{report.reason}</p>
                        {report.description && (
                          <p className="text-gray-500 mt-1">{report.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' : ''}
                        ${report.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                      `}>
                        {report.status === 'pending' ? 'Afventer' :
                         report.status === 'reviewed' ? 'Gennemgået' :
                         'Løst'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={report.status}
                        onChange={(e) => handleUpdateStatus(report.id, e.target.value as Report['status'])}
                        className="border rounded px-2 py-1"
                      >
                        <option value="pending">Afventer</option>
                        <option value="reviewed">Gennemgået</option>
                        <option value="resolved">Løst</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 