import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const MyReports = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(""); // testName being uploaded
  const fileInputRef = useRef(null);
  const [activeUploadTest, setActiveUploadTest] = useState("");

  const fetchReports = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/report/my-reports`, {
        headers: { token },
      });
      if (data.success) {
        setReports(data.reports);
        // refresh selected if open
        if (selected) {
          const updated = data.reports.find((r) => r._id === selected._id);
          if (updated) setSelected(updated);
        }
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token]);

  // ── upload handler ───────────────────────────────────────────────────────
  const handleFileChange = async (e, testName) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadingFor(testName);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("reportId", selected._id);
      formData.append("testName", testName);

      const { data } = await axios.post(
        `${backendUrl}/api/report/upload-test`,
        formData,
        { headers: { token, "Content-Type": "multipart/form-data" } }
      );

      if (data.success) {
        toast.success("File uploaded successfully!");
        fetchReports();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload failed");
      console.log(err);
    }
    setUploading(false);
    setUploadingFor("");
    e.target.value = "";
  };

  // ── delete upload ────────────────────────────────────────────────────────
  const handleDeleteUpload = async (uploadId) => {
    if (!window.confirm("Remove this uploaded file?")) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/report/delete-upload`,
        { reportId: selected._id, uploadId },
        { headers: { token } }
      );
      if (data.success) {
        toast.success("File removed");
        fetchReports();
      }
    } catch (err) {
      toast.error("Failed to remove file");
    }
  };

  const isImage = (type) => type?.startsWith("image/");
  const isPDF = (type) => type === "application/pdf";

  const severityBadge = {
    low: "bg-green-50 text-green-700 border-green-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    high: "bg-red-50 text-red-700 border-red-200",
  };

  // ══════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════
  if (selected) {
    const testsWithUploads = selected.testsRequired?.filter((t) => t.testName) || [];
    const uploadsGrouped = {};
    (selected.patientUploads || []).forEach((u) => {
      if (!uploadsGrouped[u.testName]) uploadsGrouped[u.testName] = [];
      uploadsGrouped[u.testName].push(u);
    });

    return (
      <div className="max-w-3xl mx-auto my-8 px-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-5 transition"
        >
          ← Back to all reports
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-6 pb-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Medical Report</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {new Date(selected.visitDate || selected.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
            <span className={`self-start text-xs px-3 py-1 rounded-full border font-medium capitalize ${severityBadge[selected.severity]}`}>
              {selected.severity}
            </span>
          </div>

          {/* Doctor Info */}
          {selected.doctorId && (
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 mb-5">
              {selected.doctorId.image && (
                <img src={selected.doctorId.image} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="doctor" />
              )}
              <div>
                <div className="font-medium text-gray-800 text-sm">Dr. {selected.doctorId.name}</div>
                <div className="text-xs text-gray-500">{selected.doctorId.speciality}</div>
              </div>
            </div>
          )}

          {/* Patient Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 mb-5">
            {[
              ["Patient", selected.patientName],
              ["Age / Gender", `${selected.patientAge || "—"} / ${selected.patientGender || "—"}`],
              ["Email", selected.patientEmail],
              ["Follow-up", selected.followUpDate || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-gray-400">{k}</div>
                <div className="text-sm font-medium text-gray-700 mt-0.5 break-all">{v}</div>
              </div>
            ))}
          </div>

          {/* Vitals */}
          {selected.vitals && Object.values(selected.vitals).some(Boolean) && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vitals</p>
              <div className="flex flex-wrap gap-2">
                {[["BP", selected.vitals.bloodPressure], ["Temp", selected.vitals.temperature],
                  ["Pulse", selected.vitals.pulse], ["Weight", selected.vitals.weight]]
                  .filter(([, v]) => v).map(([l, v]) => (
                    <span key={l} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-100">
                      {l}: <strong>{v}</strong>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</p>
            <p className="font-medium text-gray-700">{selected.diagnosis}</p>
            {selected.symptoms && <p className="text-sm text-gray-500 mt-1">{selected.symptoms}</p>}
          </div>

          {/* ── Tests Required + Upload ──────────────────────────────────── */}
          {testsWithUploads.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tests Required</p>
              <div className="flex flex-col gap-3">
                {testsWithUploads.map((t, i) => {
                  const testUploads = uploadsGrouped[t.testName] || [];
                  const isThisUploading = uploading && uploadingFor === t.testName;
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      {/* test header row */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{t.testName}</p>
                            {t.reason && <p className="text-xs text-gray-400">{t.reason}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${t.urgent ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-500 border-gray-200"}`}>
                            {t.urgent ? "Urgent" : "Routine"}
                          </span>
                          {/* upload button */}
                          <label className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition ${isThisUploading ? "opacity-50 pointer-events-none" : "bg-primary text-white border-primary hover:opacity-85"}`}>
                            {isThisUploading ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Uploading…
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Upload
                              </>
                            )}
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              className="hidden"
                              onChange={(e) => handleFileChange(e, t.testName)}
                              disabled={isThisUploading}
                            />
                          </label>
                        </div>
                      </div>

                      {/* uploaded files list */}
                      {testUploads.length > 0 && (
                        <div className="px-4 py-3 flex flex-col gap-2">
                          {testUploads.map((u) => (
                            <div key={u._id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                              {/* icon */}
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                                {isImage(u.fileType) ? (
                                  <img src={u.fileUrl} alt={u.fileName} className="w-8 h-8 rounded-lg object-cover" />
                                ) : (
                                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              {/* name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 truncate">{u.fileName || "Uploaded file"}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              {/* actions */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                  href={u.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUpload(u._id)}
                                  className="text-gray-300 hover:text-red-400 transition text-lg leading-none px-1"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {testUploads.length === 0 && (
                        <div className="px-4 py-3">
                          <p className="text-xs text-gray-400 italic">No files uploaded yet for this test.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General uploads (not linked to a specific test) */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Other Documents</p>
              <label className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition ${uploading && uploadingFor === "General" ? "opacity-50 pointer-events-none bg-gray-100 text-gray-400 border-gray-200" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {uploading && uploadingFor === "General" ? "Uploading…" : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload document
                  </>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "General")}
                  disabled={uploading}
                />
              </label>
            </div>
            {(uploadsGrouped["General"] || []).length > 0 ? (
              <div className="flex flex-col gap-2">
                {uploadsGrouped["General"].map((u) => (
                  <div key={u._id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-100">
                      {isImage(u.fileType) ? (
                        <img src={u.fileUrl} alt={u.fileName} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{u.fileName || "Uploaded file"}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={u.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View</a>
                      <button type="button" onClick={() => handleDeleteUpload(u._id)} className="text-gray-300 hover:text-red-400 transition text-lg leading-none px-1">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No other documents uploaded.</p>
            )}
          </div>

          {/* Prescription */}
          {selected.prescription?.some((m) => m.medicineName) && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prescription</p>
              {/* desktop */}
              <table className="hidden sm:table w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Medicine","Dosage","Duration"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.prescription.filter((m) => m.medicineName).map((m, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{m.medicineName}</td>
                      <td className="px-3 py-2 text-gray-500">{m.dosage || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{m.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* mobile */}
              <div className="flex flex-col gap-2 sm:hidden">
                {selected.prescription.filter((m) => m.medicineName).map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700">{m.medicineName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.dosage || "—"} · {m.duration || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Doctor Notes */}
          {selected.doctorNotes && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Doctor's Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{selected.doctorNotes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="text-xs text-gray-400">This report is for medical reference only.</p>
            <button onClick={() => window.print()} className="text-sm border border-gray-200 px-4 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition">
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-3xl mx-auto my-8 px-4">
      <p className="text-xl font-semibold text-gray-700 mb-6">My Medical Reports</p>

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400">No reports available yet.</p>
          <p className="text-sm text-gray-300 mt-1">Reports sent by your doctor will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => {
            const uploadCount = r.patientUploads?.length || 0;
            const testCount = r.testsRequired?.filter((t) => t.testName).length || 0;
            return (
              <div
                key={r._id}
                onClick={() => setSelected(r)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.doctorId?.image && (
                      <img src={r.doctorId.image} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="doctor" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700 text-sm truncate">Dr. {r.doctorId?.name || "Doctor"}</p>
                      <p className="text-xs text-gray-400">{r.doctorId?.speciality}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize flex-shrink-0 ${severityBadge[r.severity]}`}>
                    {r.severity}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="font-medium text-gray-700">{r.diagnosis}</p>
                  {r.symptoms && <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{r.symptoms}</p>}
                </div>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    {testCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${uploadCount > 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"}`}>
                        {uploadCount}/{testCount} tests uploaded
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-primary group-hover:underline">View & Upload →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyReports;
