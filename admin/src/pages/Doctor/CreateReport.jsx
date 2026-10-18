import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import axios from "axios";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";

// ─── helpers ───────────────────────────────────────────────────────────────
const inputCls =
  "border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-primary transition";

const SectionTitle = ({ title }) => (
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
    {title}
  </p>
);
const Divider = () => <hr className="my-5 border-gray-100" />;
const Field = ({ label, children }) => (
  <div>
    <label className="text-sm text-gray-500 mb-1 block">{label}</label>
    {children}
  </div>
);
const sevStyle = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

// ══════════════════════════════════════════════════════════════════════════
const CreateReport = () => {
  const { dToken, backendUrl } = useContext(DoctorContext);

  const [step, setStep] = useState("list"); // "list" | "form" | "preview"
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [severity, setSeverity] = useState("low");
  const [search, setSearch] = useState("");
  const [reportedIds, setReportedIds] = useState(new Set());
  const [medicines, setMedicines] = useState([{ name: "", dose: "", duration: "" }]);
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({
    patientName: "", patientEmail: "", patientAge: "", patientGender: "",
    visitDate: "", bp: "", temp: "", pulse: "", weight: "",
    diagnosis: "", symptoms: "", doctorNotes: "", followUpDate: "",
  });

  // ── fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingAppts(true);
      try {
        const [apptRes, reportRes] = await Promise.all([
          axios.get(`${backendUrl}/api/doctor/appointments`, { headers: { dToken } }),
          axios.get(`${backendUrl}/api/report/doctor-reports`, { headers: { dToken } }),
        ]);
        if (apptRes.data.success)
          setAppointments((apptRes.data.appointments || []).filter((a) => a.isCompleted));
        if (reportRes.data.success)
          setReportedIds(
            new Set(
              (reportRes.data.reports || [])
                .map((r) => r.appointmentId?.toString())
                .filter(Boolean)
            )
          );
      } catch (e) { console.log(e); }
      setLoadingAppts(false);
    };
    if (dToken) load();
  }, [dToken]);

  // ── select ───────────────────────────────────────────────────────────────
  const handleSelect = (appt) => {
    setSelectedAppt(appt);
    const u = appt.userData || {};
    const age = u.dob ? String(new Date().getFullYear() - new Date(u.dob).getFullYear()) : "";
    setForm({
      patientName: u.name || "", patientEmail: u.email || "",
      patientAge: age, patientGender: u.gender || "",
      visitDate: appt.slotDate || new Date().toISOString().split("T")[0],
      bp: "", temp: "", pulse: "", weight: "",
      diagnosis: "", symptoms: "", doctorNotes: "", followUpDate: "",
    });
    setSeverity("low");
    setMedicines([{ name: "", dose: "", duration: "" }]);
    setTests([]);
    setStep("form");
  };

  // ── form helpers ─────────────────────────────────────────────────────────
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const addMed = () => setMedicines((p) => [...p, { name: "", dose: "", duration: "" }]);
  const removeMed = (i) => setMedicines((p) => p.filter((_, idx) => idx !== i));
  const updateMed = (i, field, val) =>
    setMedicines((p) => p.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  const addTest = () => setTests((p) => [...p, { name: "", reason: "", urgent: false }]);
  const removeTest = (i) => setTests((p) => p.filter((_, idx) => idx !== i));
  const updateTest = (i, field, val) =>
    setTests((p) => p.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));

  // ── submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (sendNow = false) => {
    if (!form.patientName || !form.patientEmail || !form.diagnosis) {
      toast.error("Patient name, email and diagnosis are required");
      return;
    }
    setIsSending(true);
    try {
      const payload = {
        appointmentId: selectedAppt?._id,
        userId: selectedAppt?.userId,
        patientName: form.patientName, patientEmail: form.patientEmail,
        patientAge: form.patientAge, patientGender: form.patientGender,
        visitDate: form.visitDate,
        vitals: { bloodPressure: form.bp, temperature: form.temp, pulse: form.pulse, weight: form.weight },
        diagnosis: form.diagnosis, severity, symptoms: form.symptoms,
        prescription: medicines.filter((m) => m.name).map((m) => ({
          medicineName: m.name, dosage: m.dose, duration: m.duration,
        })),
        testsRequired: tests.filter((t) => t.name).map((t) => ({
          testName: t.name, reason: t.reason, urgent: t.urgent,
        })),
        doctorNotes: form.doctorNotes, followUpDate: form.followUpDate,
      };
      const { data } = await axios.post(`${backendUrl}/api/report/create`, payload, { headers: { dToken } });
      if (data.success) {
        if (sendNow) {
          await axios.post(`${backendUrl}/api/report/send`, { reportId: data.report._id }, { headers: { dToken } });
          toast.success("Report sent to patient!");
        } else {
          toast.success("Draft saved!");
        }
        if (selectedAppt?._id)
          setReportedIds((prev) => new Set([...prev, selectedAppt._id.toString()]));
        setStep("list");
        setSelectedAppt(null);
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error("Something went wrong"); console.log(e); }
    setIsSending(false);
  };

  // ── filtered list ────────────────────────────────────────────────────────
  const filtered = appointments
    .filter((a) => !reportedIds.has(a._id?.toString()))
    .filter((a) => {
      const q = search.toLowerCase();
      return (
        (a.userData?.name || "").toLowerCase().includes(q) ||
        (a.slotDate || "").toLowerCase().includes(q)
      );
    });

  // ── action buttons (reused in form + preview) ────────────────────────────
  const ActionButtons = ({ showPreview = false }) => (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end mt-7">
      {showPreview && (
        <button
          onClick={() => setStep("preview")}
          className="w-full sm:w-auto border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          Preview
        </button>
      )}
      {!showPreview && (
        <button
          onClick={() => setStep("form")}
          className="w-full sm:w-auto border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          ← Edit
        </button>
      )}
      <button
        onClick={() => handleSubmit(false)}
        disabled={isSending}
        className="w-full sm:w-auto border border-primary text-primary px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-50"
      >
        Save Draft
      </button>
      <button
        onClick={() => handleSubmit(true)}
        disabled={isSending}
        className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition disabled:opacity-50"
      >
        {isSending ? "Sending…" : "Send to Patient"}
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // STEP 1 — Appointments list
  // ══════════════════════════════════════════════════════════════════════
  if (step === "list") {
    return (
      <div className="m-3 sm:m-5 max-w-5xl">

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <p className="text-lg font-medium text-gray-700">Create Report</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Select a completed appointment to write a report
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or date..."
              className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm w-full focus:outline-none focus:border-primary"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loadingAppts ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm animate-pulse">Loading appointments…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-14 text-center shadow-sm">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No completed appointments found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? "Try a different search term." : "Completed appointments will appear here."}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop table (md+) ─────────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[2rem_1fr_110px_150px_90px_130px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
                {["#", "Patient", "Age / Gender", "Date & Time", "Payment", ""].map((h) => (
                  <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {filtered.map((appt, idx) => {
                const u = appt.userData || {};
                const age = u.dob ? new Date().getFullYear() - new Date(u.dob).getFullYear() : "—";
                return (
                  <div key={appt._id} className="grid grid-cols-[2rem_1fr_110px_150px_90px_130px] gap-4 items-center px-5 py-4 border-b border-gray-50 hover:bg-blue-50/30 transition">
                    <span className="text-sm text-gray-400">{idx + 1}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={u.image || assets.profile_icon} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{u.name || "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email || ""}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{age} yrs</p>
                      <p className="text-xs text-gray-400 capitalize">{u.gender || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{appt.slotDate || "—"}</p>
                      <p className="text-xs text-gray-400">{appt.slotTime || ""}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium w-fit ${appt.payment ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {appt.payment ? "Online" : "Cash"}
                    </span>
                    <button
                      onClick={() => handleSelect(appt)}
                      className="flex items-center gap-1.5 bg-primary text-white text-xs px-4 py-1.5 rounded-lg hover:opacity-85 transition font-medium"
                    >
                      Create Report
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile cards (below md) ──────────────────────────────── */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((appt, idx) => {
                const u = appt.userData || {};
                const age = u.dob ? new Date().getFullYear() - new Date(u.dob).getFullYear() : "—";
                return (
                  <div key={appt._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={u.image || assets.profile_icon} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{u.name || "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email || ""}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${appt.payment ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {appt.payment ? "Online" : "Cash"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-400">Age</p>
                        <p className="text-sm text-gray-700 font-medium">{age} yrs</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Gender</p>
                        <p className="text-sm text-gray-700 font-medium capitalize">{u.gender || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Date</p>
                        <p className="text-sm text-gray-700 font-medium">{appt.slotDate || "—"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelect(appt)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm px-4 py-2.5 rounded-lg hover:opacity-85 transition font-medium"
                    >
                      Create Report
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            {filtered.length} completed appointment{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // STEP 2 — Form & Preview
  // ══════════════════════════════════════════════════════════════════════
  const u = selectedAppt?.userData || {};

  return (
    <div className="m-3 sm:m-5 max-w-5xl">

      {/* breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStep("list")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Appointments
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">Create Report</span>
      </div>

      {/* patient banner */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 sm:px-5 sm:py-4 mb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src={u.image || assets.profile_icon}
            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
            alt={u.name}
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-800 truncate">{u.name || "—"}</p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {u.email}&nbsp;·&nbsp;{selectedAppt?.slotDate} {selectedAppt?.slotTime}
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 font-medium whitespace-nowrap">
          Completed
        </span>
      </div>

      {/* tabs */}
      <div className="flex border-b border-gray-100 mb-5">
        {["form", "preview"].map((t) => (
          <button
            key={t}
            onClick={() => setStep(t)}
            className={`px-5 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              step === t ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "form" ? "Fill Details" : "Preview"}
          </button>
        ))}
      </div>

      {/* ── FORM ──────────────────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm">

          {/* Patient info */}
          <SectionTitle title="Patient Information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Field label="Full Name *">
              <input name="patientName" value={form.patientName} onChange={handleChange} placeholder="Patient name" className={inputCls} />
            </Field>
            <Field label="Email *">
              <input name="patientEmail" value={form.patientEmail} onChange={handleChange} placeholder="patient@email.com" className={inputCls} />
            </Field>
            <Field label="Age">
              <input name="patientAge" value={form.patientAge} onChange={handleChange} placeholder="e.g. 32" className={inputCls} />
            </Field>
            <Field label="Gender">
              <select name="patientGender" value={form.patientGender} onChange={handleChange} className={inputCls}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Visit Date">
              <input type="date" name="visitDate" value={form.visitDate} onChange={handleChange} className={inputCls} />
            </Field>
          </div>

          <Divider />

          {/* Vitals */}
          <SectionTitle title="Vitals" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[["bp","Blood Pressure","120/80 mmHg"],["temp","Temperature","98.6°F"],["pulse","Pulse","72 bpm"],["weight","Weight","70 kg"]].map(([k,l,ph]) => (
              <Field key={k} label={l}>
                <input name={k} value={form[k]} onChange={handleChange} placeholder={ph} className={inputCls} />
              </Field>
            ))}
          </div>

          <Divider />

          {/* Diagnosis */}
          <SectionTitle title="Diagnosis" />
          <div className="mb-3">
            <Field label="Primary Diagnosis *">
              <input name="diagnosis" value={form.diagnosis} onChange={handleChange} placeholder="e.g. Viral fever, Hypertension" className={inputCls} />
            </Field>
          </div>
          <div className="mb-3">
            <label className="text-sm text-gray-500 mb-2 block">Severity</label>
            <div className="flex flex-wrap gap-2">
              {["low","medium","high"].map((s) => (
                <button key={s} onClick={() => setSeverity(s)}
                  className={`px-4 py-1.5 rounded-full text-sm border capitalize font-medium transition-all ${severity === s ? sevStyle[s] : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Field label="Symptoms">
            <textarea name="symptoms" value={form.symptoms} onChange={handleChange} placeholder="Fever, headache, fatigue…" rows={2} className={`${inputCls} resize-none`} />
          </Field>

          <Divider />

          {/* Tests Required */}
          <SectionTitle title="Tests Required" />
          {tests.length === 0 && (
            <p className="text-sm text-gray-400 mb-2">No tests added. Click below to add one.</p>
          )}
          <div className="space-y-2 mb-2">
            {tests.map((test, i) => (
              <div key={i} className="flex flex-col sm:grid sm:grid-cols-[2fr_2fr_auto_auto] gap-2 items-start sm:items-center p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={test.name}
                  onChange={(e) => updateTest(i, "name", e.target.value)}
                  placeholder="Test name (e.g. CBC, LFT, X-Ray)"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={test.reason}
                  onChange={(e) => updateTest(i, "reason", e.target.value)}
                  placeholder="Reason (optional)"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); updateTest(i, "urgent", !test.urgent); }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-all whitespace-nowrap ${
                    test.urgent
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${test.urgent ? "bg-red-500" : "bg-gray-300"}`} />
                  {test.urgent ? "Urgent" : "Routine"}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); removeTest(i); }}
                  className="self-center text-gray-300 hover:text-red-400 text-xl px-2 py-1 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); addTest(); }}
            className="flex items-center gap-1.5 text-primary text-sm hover:underline mt-1"
          >
            <span className="text-lg leading-none">+</span> Add test
          </button>

          <Divider />

          {/* Prescription */}
          <SectionTitle title="Prescription" />
          <div className="space-y-2 mb-2">
            {medicines.map((med, i) => (
              <div key={i} className="flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-2">
                <input value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} placeholder="Medicine name" className={inputCls} />
                <input value={med.dose} onChange={(e) => updateMed(i, "dose", e.target.value)} placeholder="Dosage" className={inputCls} />
                <input value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="Duration" className={inputCls} />
                <button onClick={() => removeMed(i)} className="self-center sm:self-auto text-gray-300 hover:text-red-400 text-xl px-2 transition">×</button>
              </div>
            ))}
          </div>
          <button onClick={addMed} className="text-primary text-sm hover:underline mt-1">+ Add medicine</button>

          <Divider />

          {/* Notes */}
          <SectionTitle title="Notes & Follow-up" />
          <div className="mb-3">
            <Field label="Doctor's Notes">
              <textarea name="doctorNotes" value={form.doctorNotes} onChange={handleChange} placeholder="Additional observations and advice…" rows={3} className={`${inputCls} resize-none`} />
            </Field>
          </div>
          <Field label="Follow-up Date">
            <input type="date" name="followUpDate" value={form.followUpDate} onChange={handleChange} className={`${inputCls} sm:max-w-xs`} />
          </Field>

          <ActionButtons showPreview />
        </div>
      )}

      {/* ── PREVIEW ───────────────────────────────────────────────────────── */}
      {step === "preview" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-6 pb-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-semibold text-primary">Medical Report</h2>
              <p className="text-sm text-gray-400 mt-0.5">Prescription & Clinical Summary</p>
            </div>
            <span className={`self-start text-xs px-3 py-1 rounded-full border font-medium capitalize ${sevStyle[severity]}`}>
              {severity}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 mb-5">
            {[
              ["Patient", form.patientName || "—"],
              ["Age / Gender", `${form.patientAge || "—"} / ${form.patientGender || "—"}`],
              ["Email", form.patientEmail || "—"],
              ["Follow-up", form.followUpDate || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-gray-400">{k}</div>
                <div className="text-sm font-medium text-gray-700 mt-0.5 break-all">{v}</div>
              </div>
            ))}
          </div>

          {[form.bp, form.temp, form.pulse, form.weight].some(Boolean) && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vitals</p>
              <div className="flex flex-wrap gap-2">
                {[["BP",form.bp],["Temp",form.temp],["Pulse",form.pulse],["Weight",form.weight]]
                  .filter(([,v]) => v)
                  .map(([l,v]) => (
                    <span key={l} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-100">
                      {l}: <strong>{v}</strong>
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</p>
            <p className="font-medium text-gray-700">{form.diagnosis || "—"}</p>
            {form.symptoms && <p className="text-sm text-gray-500 mt-1">{form.symptoms}</p>}
          </div>

          {tests.some((t) => t.name) && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tests Required</p>
              {/* desktop table */}
              <table className="hidden sm:table w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Test", "Reason", "Priority"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.filter((t) => t.name).map((t, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-gray-500">{t.reason || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${t.urgent ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {t.urgent ? "Urgent" : "Routine"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* mobile cards */}
              <div className="flex flex-col gap-2 sm:hidden">
                {tests.filter((t) => t.name).map((t, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{t.name}</p>
                      {t.reason && <p className="text-xs text-gray-500 mt-0.5">{t.reason}</p>}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap flex-shrink-0 ${t.urgent ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {t.urgent ? "Urgent" : "Routine"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {medicines.some((m) => m.name) && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prescription</p>
              {/* desktop table */}
              <table className="hidden sm:table w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Medicine","Dosage","Duration"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {medicines.filter((m) => m.name).map((m, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{m.name}</td>
                      <td className="px-3 py-2 text-gray-500">{m.dose || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{m.duration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* mobile cards */}
              <div className="flex flex-col gap-2 sm:hidden">
                {medicines.filter((m) => m.name).map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.dose || "—"} · {m.duration || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.doctorNotes && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Doctor's Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{form.doctorNotes}</p>
            </div>
          )}

          <div className="pt-5 border-t border-gray-100">
            <ActionButtons showPreview={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateReport;
