import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShiftReport, GoogleDriveStatus, AppRole, DeepwellReadingInput } from './types';
import {
  getReports,
  saveReport,
  updateReport,
  reviseReportInStorage,
  getSavedSpreadsheetMeta,
  saveSpreadsheetMeta,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  requestGoogleSheetsAccess,
} from './services/firebaseAuth';
import { isSupervisor, isSuperUser } from './services/supervisorAuth';
import {
  getOrCreateSpreadsheet,
  appendReportToSheet,
} from './services/googleSheets';
import { Navbar } from './components/Navbar';
import { OperatorForm } from './components/OperatorForm';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { DailyUsageViewer } from './components/DailyUsageViewer';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { SupervisorManagerModal } from './components/SupervisorManagerModal';
import { LoginScreen } from './components/LoginScreen';
import {
  CheckCircle2,
  ExternalLink,
  Droplet,
  ShieldCheck,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'operator' | 'daily_view' | 'supervisor'>('operator');
  const [userRole, setUserRole] = useState<AppRole>(() => {
    const saved = localStorage.getItem('water_monitoring_user_role') as AppRole | null;
    return saved || 'operator_plant1';
  });
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState<boolean>(false);
  const [supervisorVersion, setSupervisorVersion] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<ShiftReport | null>(null);

  // Google Drive & Sheets Integration State
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>({
    connected: false,
    userEmail: null,
    userName: null,
    userPhoto: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    spreadsheetName: null,
    lastSyncedAt: null,
    isSyncing: false,
    error: null,
  });

  // Load initial reports from storage
  useEffect(() => {
    const loaded = getReports();
    setReports(loaded);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(async (user, token) => {
      setAuthChecking(false);
      if (user) {
        let sheetId: string | null = null;
        let sheetUrl: string | null = null;

        if (token) {
          try {
            const storedMeta = getSavedSpreadsheetMeta();
            const sheetMeta = await getOrCreateSpreadsheet(token, storedMeta?.id);
            saveSpreadsheetMeta(sheetMeta);
            sheetId = sheetMeta.id;
            sheetUrl = sheetMeta.url;
          } catch (err: any) {
            console.warn('Could not auto-connect spreadsheet:', err.message);
          }
        }

        setDriveStatus({
          connected: !!token && !!sheetId,
          userEmail: user.email,
          userName: user.displayName,
          userPhoto: user.photoURL,
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
          spreadsheetName: 'Water_Monitoring_System - Plant 1 & Plant 2',
          lastSyncedAt: new Date().toLocaleTimeString(),
          isSyncing: false,
          error: null,
        });
      } else {
        setDriveStatus({
          connected: false,
          userEmail: null,
          userName: null,
          userPhoto: null,
          spreadsheetId: null,
          spreadsheetUrl: null,
          spreadsheetName: null,
          lastSyncedAt: null,
          isSyncing: false,
          error: null,
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Check if current user is supervisor
  const isUserSupervisor = useMemo(() => {
    return isSupervisor(driveStatus.userEmail);
  }, [driveStatus.userEmail, supervisorVersion]);

  // Check if current user is the sole Super User / Administrator
  const isUserSuperUser = useMemo(() => {
    return isSuperUser(driveStatus.userEmail);
  }, [driveStatus.userEmail]);

  // Google Sign In action (Login to application)
  const handleConnectGoogleDrive = async (requestedRole?: AppRole) => {
    setAuthError(null);
    setDriveStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const result = await googleSignIn();
      if (result) {
        if (requestedRole) {
          setUserRole(requestedRole);
          localStorage.setItem('water_monitoring_user_role', requestedRole);
          if (requestedRole === 'supervisor') {
            setCurrentView('supervisor');
          } else {
            setCurrentView('operator');
          }
        }

        let sheetId: string | null = null;
        let sheetUrl: string | null = null;

        if (result.accessToken) {
          try {
            const storedMeta = getSavedSpreadsheetMeta();
            const sheetMeta = await getOrCreateSpreadsheet(result.accessToken, storedMeta?.id);
            saveSpreadsheetMeta(sheetMeta);
            sheetId = sheetMeta.id;
            sheetUrl = sheetMeta.url;
          } catch (sErr: any) {
            console.warn('Sheets connection issue:', sErr.message);
          }
        }

        setDriveStatus({
          connected: !!sheetId,
          userEmail: result.user.email,
          userName: result.user.displayName,
          userPhoto: result.user.photoURL,
          spreadsheetId: sheetId,
          spreadsheetUrl: sheetUrl,
          spreadsheetName: 'Water_Monitoring_System - Plant 1 & Plant 2',
          lastSyncedAt: sheetId ? new Date().toLocaleTimeString() : null,
          isSyncing: false,
          error: null,
        });
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const msg = err.message || 'Gagal masuk dengan akun Google.';
      setAuthError(msg);
      setDriveStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: msg,
      }));
    }
  };

  // Explicit Google Sheets authorization (requested on demand)
  const handleConnectSheets = async () => {
    try {
      setDriveStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      const token = await requestGoogleSheetsAccess();
      if (token) {
        const storedMeta = getSavedSpreadsheetMeta();
        const sheetMeta = await getOrCreateSpreadsheet(token, storedMeta?.id);
        saveSpreadsheetMeta(sheetMeta);
        setDriveStatus((prev) => ({
          ...prev,
          connected: true,
          spreadsheetId: sheetMeta.id,
          spreadsheetUrl: sheetMeta.url,
          lastSyncedAt: new Date().toLocaleTimeString(),
          isSyncing: false,
          error: null,
        }));
      }
    } catch (err: any) {
      console.error('Sheets authorization failed:', err);
      const msg =
        err.message ||
        'Gagal menghubungkan Google Sheets. Pastikan akun telah diberi izin akses.';
      setDriveStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: msg,
      }));
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    await logout();
    saveSpreadsheetMeta(null);
    setDriveStatus({
      connected: false,
      userEmail: null,
      userName: null,
      userPhoto: null,
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetName: null,
      lastSyncedAt: null,
      isSyncing: false,
      error: null,
    });
    setCurrentView('operator');
  };

  const handleRoleSelect = (role: AppRole) => {
    setUserRole(role);
    localStorage.setItem('water_monitoring_user_role', role);
    if (role === 'supervisor') {
      setCurrentView('supervisor');
    } else if (currentView === 'supervisor') {
      setCurrentView('operator');
    }
  };

  const handleReviseReport = async (
    reportId: string,
    updatedReadings: DeepwellReadingInput[],
    reason: string
  ) => {
    const updated = reviseReportInStorage(
      reportId,
      updatedReadings,
      driveStatus.userEmail || 'Supervisor',
      reason
    );
    setReports(getReports());

    // Also sync to Google Sheets if connected
    const token = await getAccessToken();
    if (token && driveStatus.spreadsheetId && updated) {
      try {
        await appendReportToSheet(token, driveStatus.spreadsheetId, updated);
      } catch (err) {
        console.warn('Google Sheets revision sync note:', err);
      }
    }
  };

  // Submit Shift Report from Operator Form
  const handleSubmitReport = async (newReport: ShiftReport) => {
    setIsSubmitting(true);
    let synced = false;

    try {
      // 1. Sync to Google Sheets if connected
      const token = await getAccessToken();
      if (token && driveStatus.spreadsheetId) {
        const syncRes = await appendReportToSheet(token, driveStatus.spreadsheetId, newReport);
        if (syncRes.success) {
          synced = true;
          setDriveStatus((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString(),
          }));
        }
      }

      // 2. Persist in local storage
      const finalReport: ShiftReport = {
        ...newReport,
        syncedToGoogleSheets: synced,
      };

      saveReport(finalReport);
      setReports((prev) => [finalReport, ...prev]);
      setSuccessReport(finalReport);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual sync all reports to Google Sheets
  const handleSyncAllToSheets = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !driveStatus.spreadsheetId) {
      handleConnectGoogleDrive();
      return;
    }

    setDriveStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      const allReports = getReports();
      // Sync reports that are not marked synced
      const unSynced = allReports.filter((r) => !r.syncedToGoogleSheets);
      const targetList = unSynced.length > 0 ? unSynced : allReports.slice(0, 5);

      for (const rep of targetList) {
        await appendReportToSheet(token, driveStatus.spreadsheetId, rep);
        updateReport(rep.id, { syncedToGoogleSheets: true });
      }

      setReports(getReports());
      setDriveStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString(),
      }));
    } catch (err: any) {
      console.error('Error syncing all reports:', err);
      setDriveStatus((prev) => ({ ...prev, isSyncing: false, error: err.message }));
    }
  }, [driveStatus.spreadsheetId]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Memeriksa autentikasi Akun Google...</p>
        </div>
      </div>
    );
  }

  // Require Google Sign-in as requested: operators can login freely with any Google account,
  // but must authenticate first
  if (!driveStatus.userEmail) {
    return (
      <LoginScreen
        onLogin={handleConnectGoogleDrive}
        isLoading={driveStatus.isSyncing}
        error={authError || driveStatus.error}
      />
    );
  }

  const currentUserObj = {
    displayName: driveStatus.userName,
    email: driveStatus.userEmail,
    photoURL: driveStatus.userPhoto,
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        userRole={userRole}
        onSelectRole={handleRoleSelect}
        driveStatus={driveStatus}
        onConnectDrive={handleConnectSheets}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        currentUser={currentUserObj}
        isUserSupervisor={isUserSupervisor}
        isSuperUser={isUserSuperUser}
        onOpenSupervisorManager={() => setIsSupervisorModalOpen(true)}
        onLogout={handleDisconnectGoogleDrive}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentView === 'operator' && (
          <OperatorForm
            onSubmitReport={handleSubmitReport}
            isSyncing={isSubmitting}
            currentUser={currentUserObj}
            isSupervisorUser={isUserSupervisor}
            userRole={userRole}
          />
        )}

        {currentView === 'daily_view' && (
          <DailyUsageViewer
            reports={reports}
            userRole={userRole}
            currentUserEmail={driveStatus.userEmail}
            currentUserName={driveStatus.userName}
            onSwitchToInput={() => setCurrentView('operator')}
          />
        )}

        {currentView === 'supervisor' && (
          <SupervisorDashboard
            reports={reports}
            driveStatus={driveStatus}
            onSyncAllToSheets={handleSyncAllToSheets}
            currentUserEmail={driveStatus.userEmail}
            isUserSupervisor={isUserSupervisor}
            isSuperUser={isUserSuperUser}
            onOpenSupervisorManager={() => setIsSupervisorModalOpen(true)}
            onSwitchToOperator={() => setCurrentView('operator')}
            onReviseReport={handleReviseReport}
            onReportsUpdated={(updated) => setReports(updated)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">Water Monitoring System</span>
            <span>•</span>
            <span>Plant 1 (DW 1 - DW 2) & Plant 2 (DW 3 - DW 6)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('operator')}
              className="hover:text-slate-200 transition"
            >
              Input Operator
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView('daily_view')}
              className="hover:text-slate-200 transition text-sky-400"
            >
              Rekap Harian
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView('supervisor')}
              className="hover:text-slate-200 transition"
            >
              Supervisor Portal
            </button>
            <span>•</span>
            {isUserSuperUser && (
              <>
                <button
                  onClick={() => setIsSupervisorModalOpen(true)}
                  className="hover:text-amber-300 transition text-amber-400 font-medium"
                >
                  Kelola Supervisor
                </button>
                <span>•</span>
              </>
            )}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="hover:text-slate-200 transition text-emerald-400"
            >
              Google Drive & Sheets
            </button>
          </div>
        </div>
      </footer>

      {/* Supervisor Email Manager Modal */}
      <SupervisorManagerModal
        isOpen={isSupervisorModalOpen}
        onClose={() => setIsSupervisorModalOpen(false)}
        currentUserEmail={driveStatus.userEmail}
        onSupervisorsChanged={() => setSupervisorVersion((v) => v + 1)}
      />

      {/* Google Drive Integration Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        status={driveStatus}
        onConnect={handleConnectGoogleDrive}
        onDisconnect={handleDisconnectGoogleDrive}
        onSyncNow={handleSyncAllToSheets}
      />

      {/* Submission Success Dialog */}
      {successReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setSuccessReport(null)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Laporan Shift Berhasil Disimpan!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Data pembacaan Deepwell 1 - 6 telah tercatat secara resmi ke dalam sistem.
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Laporan:</span>
                <span className="font-mono text-slate-900">{successReport.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Submit:</span>
                <span className="font-mono text-slate-900">{successReport.submittedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shift & Tanggal:</span>
                <span>Shift {successReport.shift} • {successReport.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operator:</span>
                <span className="font-bold text-slate-900">{successReport.operatorName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Total Pemakaian Air:</span>
                <span className="font-bold font-mono text-sky-700 text-sm">
                  {successReport.totalPemakaian} m³
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Google Sheets:</span>
                {successReport.syncedToGoogleSheets ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Tersinkronkan ke Drive
                  </span>
                ) : (
                  <span className="text-slate-500">Tersimpan di Local Storage</span>
                )}
              </div>
            </div>

            {driveStatus.spreadsheetUrl && (
              <a
                href={driveStatus.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold mb-3 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Lihat Baris Baru di Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => setSuccessReport(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Tutup & Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
