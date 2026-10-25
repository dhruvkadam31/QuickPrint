import { useState } from "react";

/**
 * SmartDocumentChecker - Interactive validation report for uploaded documents.
 * Displays analysis progress, overall status, per-file validation checks,
 * print-quality warnings, blank page alerts, and preview capabilities.
 */
export default function SmartDocumentChecker({
  files = [],
  activeIdx = 0,
  setActiveIdx,
  analyzing = false,
  analysisProgress = 0,
  analysisStage = "",
  onReplaceFile,
  onRemoveFile,
  onRecheckFile,
  onAddFiles,
  onContinue,
  onBack,
}) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState({});

  const activeFile = files[activeIdx] || files[0] || null;
  const validation = activeFile?.validation || null;

  // Determine if there are critical failures across any file
  const hasCriticalFailures = files.some(
    (f) => f.validation?.overallStatus === "FAILED"
  );

  // Check if active file has warnings
  const activeHasWarnings = validation?.overallStatus === "WARNING";
  const isAcknowledged = Boolean(acknowledgedWarnings[activeFile?.filename || activeIdx]);

  const toggleAcknowledge = () => {
    const key = activeFile?.filename || activeIdx;
    setAcknowledgedWarnings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If analyzing, render the animated analysis progress screen
  if (analyzing) {
    return (
      <div className="card checker-analyzing-card" style={{ padding: "36px 24px", textAlign: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: "var(--brand-light)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              boxShadow: "0 4px 12px rgba(30, 64, 175, 0.15)",
              animation: "spin 2s linear infinite",
            }}
          >
            ⚙️
          </div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8, color: "var(--gray-800)" }}>
            Smart Document Checker
          </h3>
          <p className="text-muted" style={{ fontSize: "0.9rem", maxWidth: 440, margin: "0 auto" }}>
            Inspecting document structure, blank pages, and print quality before configuring your print order.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ maxWidth: 460, margin: "0 auto 20px" }}>
          <div
            style={{
              height: 8,
              background: "var(--gray-200)",
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: `${analysisProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--brand), #3b82f6)",
                borderRadius: 6,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--gray-500)" }}>
            <span style={{ fontWeight: 600, color: "var(--brand)" }}>{analysisStage || "Analyzing document..."}</span>
            <span>{Math.round(analysisProgress)}%</span>
          </div>
        </div>

        {/* Inspection Steps */}
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto",
            textAlign: "left",
            background: "var(--gray-50)",
            borderRadius: 10,
            padding: "16px 20px",
            border: "1px solid var(--gray-200)",
          }}
        >
          <div style={{ display: "grid", gap: 10, fontSize: "0.84rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: analysisProgress >= 25 ? "var(--success)" : "var(--gray-400)" }}>
              <span>{analysisProgress >= 25 ? "✓" : "○"}</span>
              <span>1. File integrity & authentic signature check</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: analysisProgress >= 50 ? "var(--success)" : "var(--gray-400)" }}>
              <span>{analysisProgress >= 50 ? "✓" : "○"}</span>
              <span>2. Page count detection & layout verification</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: analysisProgress >= 75 ? "var(--success)" : "var(--gray-400)" }}>
              <span>{analysisProgress >= 75 ? "✓" : "○"}</span>
              <span>3. Blank and low-content page scan</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: analysisProgress >= 95 ? "var(--success)" : "var(--gray-400)" }}>
              <span>{analysisProgress >= 95 ? "✓" : "○"}</span>
              <span>4. Print resolution and dimension checks</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return null;
  }

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return Math.round(bytes / 1024) + " KB";
  };

  const status = validation?.overallStatus || "READY";
  const isFailed = status === "FAILED";
  const isWarning = status === "WARNING";
  const isReady = status === "READY";

  const statusBg = isFailed ? "#fef2f2" : isWarning ? "#fffbeb" : "#f0fdf4";
  const statusBorder = isFailed ? "#fca5a5" : isWarning ? "#fcd34d" : "#86efac";
  const statusColor = isFailed ? "#b91c1c" : isWarning ? "#b45309" : "#15803d";
  const statusIcon = isFailed ? "✕" : isWarning ? "⚠" : "✓";
  const statusTitle = isFailed
    ? "Validation Failed"
    : isWarning
    ? "Warnings Found"
    : "Ready to Print";

  return (
    <div className="card checker-report-card" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔍 Smart Document Report</span>
          </h3>
          <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
            Automated pre-print inspection report for your uploaded files.
          </p>
        </div>

        {/* Multi-file summary badge */}
        {files.length > 1 && (
          <div
            style={{
              fontSize: "0.8rem",
              background: "var(--gray-100)",
              padding: "4px 10px",
              borderRadius: "16px",
              fontWeight: 600,
              color: "var(--gray-600)",
            }}
          >
            {files.length} documents uploaded
          </div>
        )}
      </div>

      {/* Multi-file Tabs Selector */}
      {files.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 10,
            marginBottom: 16,
            borderBottom: "1px solid var(--gray-200)",
          }}
        >
          {files.map((file, idx) => {
            const fStatus = file.validation?.overallStatus || "READY";
            const fColor = fStatus === "FAILED" ? "var(--danger)" : fStatus === "WARNING" ? "var(--warning)" : "var(--success)";
            const fBadge = fStatus === "FAILED" ? "✕" : fStatus === "WARNING" ? "⚠" : "✓";
            const isTabActive = activeIdx === idx;

            return (
              <button
                key={file.filename || idx}
                onClick={() => setActiveIdx(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 20,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  border: isTabActive ? "2px solid var(--brand)" : "1px solid var(--gray-300)",
                  background: isTabActive ? "var(--brand-light)" : "white",
                  color: isTabActive ? "var(--brand)" : "var(--gray-700)",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: fColor,
                    color: "white",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                >
                  {fBadge}
                </span>
                <span>{file.originalName?.length > 18 ? file.originalName.slice(0, 16) + "..." : file.originalName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Overall Status Banner */}
      <div
        style={{
          background: statusBg,
          border: `1.5px solid ${statusBorder}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: statusColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            fontWeight: 800,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {statusIcon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: statusColor }}>
              {statusTitle}
            </h4>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                background: statusColor,
                color: "white",
              }}
            >
              {status}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--gray-700)", lineHeight: 1.5 }}>
            {isFailed
              ? validation?.errors?.[0] || "A critical error prevents this document from being safely processed."
              : isWarning
              ? validation?.warnings?.[0] || "Document is printable, but contains potential quality or layout warnings to review."
              : `All validation checks passed. Document contains ${validation?.detectedPageCount || activeFile.pageCount || 1} printable page(s).`}
          </p>

          {/* Additional error/warning bullet points if multiple */}
          {validation?.errors?.length > 1 && (
            <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#991b1b" }}>
              {validation.errors.slice(1).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {validation?.warnings?.length > 1 && (
            <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: "0.82rem", color: "#92400e" }}>
              {validation.warnings.slice(1).map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Document Overview Metadata Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ background: "var(--gray-50)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>FILE NAME</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={activeFile.originalName}>
            {activeFile.originalName}
          </div>
        </div>

        <div style={{ background: "var(--gray-50)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>FORMAT</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--gray-800)" }}>
            {validation?.fileFormat || "PDF"}
          </div>
        </div>

        <div style={{ background: "var(--gray-50)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>FILE SIZE</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--gray-800)" }}>
            {formatSize(validation?.fileSize || activeFile.fileSize)}
          </div>
        </div>

        <div style={{ background: "var(--gray-50)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>PAGE COUNT</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--gray-800)" }}>
            {validation?.pageCountLabel || `${activeFile.pageCount || 1} pages`}
            {validation && !validation.isPageCountExact && (
              <span style={{ fontSize: "0.72rem", color: "var(--warning)", marginLeft: 4 }}>*est</span>
            )}
          </div>
        </div>

        <div style={{ background: "var(--gray-50)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--gray-200)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>PREVIEW</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: validation?.previewStatus === "AVAILABLE" ? "var(--success)" : "var(--danger)" }}>
            {validation?.previewStatus === "AVAILABLE" ? "✓ Ready" : "✕ Unavailable"}
          </div>
        </div>
      </div>

      {/* Detailed Checkpoints Breakdown */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12, color: "var(--gray-700)" }}>
          Inspection Details:
        </h4>

        <div style={{ display: "grid", gap: 10 }}>
          {/* 1. File Integrity & Signature Check */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--gray-200)",
              background: validation?.checks?.fileIntegrity?.status === "FAIL" ? "#fef2f2" : "#fbfbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{validation?.checks?.fileIntegrity?.status === "FAIL" ? "❌" : "✅"}</span>
                <span>File Integrity & Signature</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: 2 }}>
                {validation?.checks?.fileIntegrity?.message || "File header and content integrity verified."}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: validation?.checks?.fileIntegrity?.status === "FAIL" ? "#fee2e2" : "#dcfce7",
                color: validation?.checks?.fileIntegrity?.status === "FAIL" ? "#b91c1c" : "#15803d",
              }}
            >
              {validation?.checks?.fileIntegrity?.status || "PASS"}
            </span>
          </div>

          {/* 2. Format & Security Check */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--gray-200)",
              background: validation?.checks?.formatValidation?.status === "FAIL" ? "#fef2f2" : "#fbfbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{validation?.checks?.formatValidation?.status === "FAIL" ? "❌" : "✅"}</span>
                <span>Format Authentication</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: 2 }}>
                {validation?.checks?.formatValidation?.message || "Format verified by signature analysis."}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: validation?.checks?.formatValidation?.status === "FAIL" ? "#fee2e2" : "#dcfce7",
                color: validation?.checks?.formatValidation?.status === "FAIL" ? "#b91c1c" : "#15803d",
              }}
            >
              {validation?.checks?.formatValidation?.status || "PASS"}
            </span>
          </div>

          {/* 3. Page Count Detection */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--gray-200)",
              background: validation?.checks?.pageCount?.status === "WARN" ? "#fffbeb" : "#fbfbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{validation?.checks?.pageCount?.status === "WARN" ? "⚠️" : "✅"}</span>
                <span>Page Count Validation</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: 2 }}>
                {validation?.checks?.pageCount?.message || `Detected ${activeFile.pageCount || 1} pages.`}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: validation?.checks?.pageCount?.status === "WARN" ? "#fef3c7" : "#dcfce7",
                color: validation?.checks?.pageCount?.status === "WARN" ? "#b45309" : "#15803d",
              }}
            >
              {validation?.checks?.pageCount?.status || "PASS"}
            </span>
          </div>

          {/* 4. Blank Page Detector */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--gray-200)",
              background: validation?.checks?.blankPages?.status === "WARN" ? "#fffbeb" : "#fbfbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{validation?.checks?.blankPages?.status === "WARN" ? "⚠️" : "✅"}</span>
                <span>Blank Page Detection</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: 2 }}>
                {validation?.checks?.blankPages?.message || "No blank pages detected."}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: validation?.checks?.blankPages?.status === "WARN" ? "#fef3c7" : "#dcfce7",
                color: validation?.checks?.blankPages?.status === "WARN" ? "#b45309" : "#15803d",
              }}
            >
              {validation?.checks?.blankPages?.status || "PASS"}
            </span>
          </div>

          {/* 5. Print Quality & Resolution */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--gray-200)",
              background: validation?.checks?.printQuality?.status === "WARN" ? "#fffbeb" : "#fbfbfc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{validation?.checks?.printQuality?.status === "WARN" ? "⚠️" : "✅"}</span>
                <span>Print Dimensions & Resolution</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", marginTop: 2 }}>
                {validation?.checks?.printQuality?.message || "Standard printable resolution and dimensions."}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background: validation?.checks?.printQuality?.status === "WARN" ? "#fef3c7" : "#dcfce7",
                color: validation?.checks?.printQuality?.status === "WARN" ? "#b45309" : "#15803d",
              }}
            >
              {validation?.checks?.printQuality?.status || "PASS"}
            </span>
          </div>
        </div>
      </div>

      {/* Warning Acknowledgment Checkbox if warnings exist */}
      {activeHasWarnings && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
          }}
        >
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isAcknowledged}
              onChange={toggleAcknowledge}
              style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, cursor: "pointer" }}
            />
            <div style={{ fontSize: "0.85rem", color: "#92400e" }}>
              <strong>I acknowledge the warnings detected for this file.</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#b45309" }}>
                I have reviewed the flagged items (such as blank pages or resolution) and wish to proceed with printing as-is.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Interactive Tool Actions: Review Preview, Replace, Recheck, Remove */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: "14px 16px",
          background: "var(--gray-50)",
          borderRadius: 8,
          border: "1px solid var(--gray-200)",
          marginBottom: 20,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Review Preview Button */}
          <button
            type="button"
            className="btn btn-gray"
            style={{ fontSize: "0.84rem", padding: "6px 12px" }}
            onClick={() => setShowPreviewModal(true)}
            disabled={!activeFile.processedUrl && !activeFile.fileUrl}
          >
            👁️ Review Preview
          </button>

          {/* Recheck Document Button */}
          <button
            type="button"
            className="btn btn-gray"
            style={{ fontSize: "0.84rem", padding: "6px 12px" }}
            onClick={() => onRecheckFile?.(activeFile)}
          >
            🔄 Recheck Document
          </button>

          {/* Replace File Button */}
          <label
            className="btn btn-gray"
            style={{ fontSize: "0.84rem", padding: "6px 12px", cursor: "pointer", margin: 0 }}
          >
            📁 Replace File
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  onReplaceFile?.(activeIdx, selected);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Remove File Button */}
          <button
            type="button"
            className="btn btn-gray"
            style={{ fontSize: "0.84rem", padding: "6px 12px", color: "var(--danger)" }}
            onClick={() => onRemoveFile?.(activeIdx)}
          >
            🗑️ Remove File
          </button>

          {/* Add Another File Button */}
          <label
            className="btn"
            style={{
              fontSize: "0.84rem",
              padding: "6px 12px",
              cursor: "pointer",
              background: "var(--brand-light)",
              color: "var(--brand)",
              margin: 0,
            }}
          >
            + Add Another
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  onAddFiles?.(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Navigation Buttons: Back vs Continue to Print Settings */}
      <div className="card-actions" style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-gray"
          style={{ minWidth: 120 }}
          onClick={onBack}
        >
          ← Upload More
        </button>

        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={onContinue}
          disabled={hasCriticalFailures || (activeHasWarnings && !isAcknowledged)}
          title={
            hasCriticalFailures
              ? "Resolve or remove failing files before continuing"
              : activeHasWarnings && !isAcknowledged
              ? "Please acknowledge the warnings above before continuing"
              : "Continue to print settings"
          }
        >
          {hasCriticalFailures
            ? "Resolve File Errors to Continue"
            : activeHasWarnings && !isAcknowledged
            ? "Acknowledge Warnings to Continue"
            : "Continue to Print Settings →"}
        </button>
      </div>

      {/* Document Preview Modal */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              margin: 0,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem" }}>
                  📄 Document Preview: {activeFile.originalName}
                </h4>
                {validation?.checks?.blankPages?.blankPages?.length > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--warning)", fontWeight: 600 }}>
                    ⚠️ Flagged blank pages: {validation.checks.blankPages.blankPages.join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-gray"
                style={{ padding: "4px 10px", fontSize: "0.85rem" }}
                onClick={() => setShowPreviewModal(false)}
              >
                ✕ Close
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 440,
                border: "1px solid var(--gray-300)",
                borderRadius: 8,
                overflow: "hidden",
                background: "#f8fafc",
              }}
            >
              {activeFile.mimeType?.startsWith("image/") ? (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                  <img
                    src={activeFile.fileUrl || activeFile.processedUrl}
                    alt={activeFile.originalName}
                    style={{ maxHeight: 420, maxWidth: "100%", objectFit: "contain", borderRadius: 4 }}
                  />
                </div>
              ) : (
                <iframe
                  src={activeFile.processedUrl || activeFile.fileUrl}
                  title="Document Preview Frame"
                  width="100%"
                  height="100%"
                  style={{ border: "none", minHeight: 440 }}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
              <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                Tip: Scroll or zoom inside the preview to inspect pages and layout.
              </span>
              <a
                href={activeFile.processedUrl || activeFile.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-gray"
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                ↗ Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
