import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { toast } from "react-toastify";

const DoctorReports = () => {
  const { dToken, backendUrl } = useContext(DoctorContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchReports = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/report/doctor-reports`,
        { headers: { dToken } }
      );
      if (data.success) setReports(data.reports);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const handleSend = async (reportId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/report/send`,
        { reportId },
        { headers: { dToken } }
      );
      if (data.success) {
        toast.success("Report sent to patient!");
        fetchReports();
      }
    } catch (err) {
      toast.error("Failed to send report");
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/report/delete`,
        { reportId },
        { headers: { dToken } }
      );
      if (data.success) {
        toast.success("Report deleted");
        fetchReports();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    if (dToken) fetchReports();
  }, [dToken]);

  const severityBadge = {
    low: "bg-green-50 text-green-600 border-green-200",
    medium: "bg-yellow-50 text-yellow-600 border-yellow-200",
    high: "bg-red-50 text-red-600 border-red-200",
  };

  const isImage = (type) => type?.startsWith("image/");

  // ── detail view ──────────────────────────────────────────────────────────
  if (selected) {
    const uploadsGrouped = {};
    (selected.patientUploads || []).forEach((u) => {
      if (!uploadsGrouped[u.testName]) uploadsGrouped[u.testName] = [];
      uploadsGrouped[u.testName].push(u);
    });
    const totalUploads = selected.patientUploads?.length || 0;

    return (
      <div className="m-3 sm:m-5 max-w-4xl">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary mb-5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Reports
        </button>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-7">
          {/* header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-5 pb-5 border-b border-gray-100">
            <div>
              <p className="text-lg font-semibold text-gray-800">{selected.patientName}</p>
              <p className="text-sm text-gray-400">{selected.patientEmail} · {selected.patientAge} yrs · {selected.patientGender}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${severityBadge[selected.severity]}`}>{selected.severity}</span>
              {selected.isSent
                ? <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-full">Sent</span>
                : <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2.5 py-1 rounded-full">Draft</span>
              }
            </div>
          </div>

          {/* diagnosis */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Diagnosis</p>
            <p className="font-medium text-gray-700">{selected.diagnosis}</p>
            {selected.symptoms && <p className="text-sm text-gray-500 mt-1">{selected.symptoms}</p>}
          </div>

          {/* tests + patient uploads */}
          {selected.testsRequired?.some((t) => t.testName) && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tests Required</p>
                {totalUploads > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                    {totalUploads} file{totalUploads !== 1 ? "s" : ""} uploaded by patient
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {selected.testsRequired.filter((t) => t.testName).map((t, i) => {
                  const uploads = uploadsGrouped[t.testName] || [];
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{t.testName}</p>
                          {t.reason && <p className="text-xs text-gray-400">{t.reason}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${t.urgent ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-500 border-gray-200"}`}>
                            {t.urgent ? "Urgent" : "Routine"}
                          </span>
                          {uploads.length > 0
                            ? <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">{uploads.length} uploaded</span>
                            : <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">Pending</span>
                          }
                        </div>
                      </div>
                      {uploads.length > 0 ? (
                        <div className="px-4 py-3 flex flex-col gap-2">
                          {uploads.map((u) => (
                            <div key={u._id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                                {isImage(u.fileType)
                                  ? <img src={u.fileUrl} alt={u.fileName} className="w-8 h-8 rounded-lg object-cover" />
                                  : <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 truncate">{u.fileName || "Uploaded file"}</p>
                                <p className="text-xs text-gray-400">{new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                              </div>
                              <a href={u.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">View</a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3">
                          <p className="text-xs text-gray-400 italic">Patient hasn't uploaded this test yet.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* general uploads */}
          {(uploadsGrouped["General"] || []).length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Other Documents</p>
              <div className="flex flex-col gap-2">
                {uploadsGrouped["General"].map((u) => (
                  <div key={u._id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                      {isImage(u.fileType)
                        ? <img src={u.fileUrl} alt={u.fileName} className="w-8 h-8 rounded-lg object-cover" />
                        : <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 01 6 18H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{u.fileName || "Uploaded file"}</p>
                      <p className="text-xs text-gray-400">{new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <a href={u.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">View</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="m-3 sm:m-5 max-w-5xl">
      <p className="mb-4 text-lg font-medium text-gray-700">My Reports</p>

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
          <p className="text-gray-400">No reports created yet.</p>
        </div>
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#","Patient","Diagnosis","Severity","Uploads","Date","Status","Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700">{r.patientName}</div>
                      <div className="text-xs text-gray-400">{r.patientEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{r.diagnosis}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border capitalize font-medium ${severityBadge[r.severity]}`}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      {(r.patientUploads?.length || 0) > 0
                        ? <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{r.patientUploads.length} file{r.patientUploads.length !== 1 ? "s" : ""}</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3">
                      {r.isSent
                        ? <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-full">Sent</span>
                        : <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2.5 py-1 rounded-full">Draft</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setSelected(r)} className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-blue-50 hover:text-primary hover:border-blue-200 transition">View</button>
                        {!r.isSent && (
                          <button onClick={() => handleSend(r._id)} className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:opacity-80 transition">Send</button>
                        )}
                        <button onClick={() => handleDelete(r._id)} className="text-xs border border-gray-200 text-gray-500 px-3 py-1 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {reports.map((r) => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{r.patientName}</p>
                    <p className="text-xs text-gray-400">{r.patientEmail}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border capitalize font-medium flex-shrink-0 ${severityBadge[r.severity]}`}>{r.severity}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{r.diagnosis}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {r.isSent
                      ? <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-full">Sent</span>
                      : <span className="text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2.5 py-1 rounded-full">Draft</span>
                    }
                    {(r.patientUploads?.length || 0) > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{r.patientUploads.length} file{r.patientUploads.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(r)} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">View</button>
                    {!r.isSent && (
                      <button onClick={() => handleSend(r._id)} className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-80">Send</button>
                    )}
                    <button onClick={() => handleDelete(r._id)} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorReports;
