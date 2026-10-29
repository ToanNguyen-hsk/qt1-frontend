import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [coverFile, setCoverFile] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [carFiles, setCarFiles] = useState([]);
  const [carStatuses, setCarStatuses] = useState({});
  const [defaultStatus, setDefaultStatus] = useState('APP');
  const [processedResults, setProcessedResults] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [processMode, setProcessMode] = useState('auto_bump');
  const [startCarNo, setStartCarNo] = useState('9905');
  const [qtiNo, setQtiNo] = useState('QTI-PECC1-PMB2-26-10-155');

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isExporting) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isExporting]);

  const handleCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleCarFilesChange = (e) => {
    const files = Array.from(e.target.files);
    setCarFiles(files);
    const initialStatuses = {};
    files.forEach(f => { initialStatuses[f.name] = 'APP'; });
    setCarStatuses(initialStatuses);
  };

  const handleRemoveCarFile = (indexToRemove) => {
    const updated = carFiles.filter((_, idx) => idx !== indexToRemove);
    setCarFiles(updated);
  };

  const handleBatchStatusApply = (status) => {
    const updated = {};
    carFiles.forEach(f => { updated[f.name] = status; });
    setCarStatuses(updated);
  };

  const handleStatusChange = (fileName, status) => {
    setCarStatuses(prev => ({ ...prev, [fileName]: status }));
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    setCurrentStepText('');
    alert("Đã hủy tiến trình xử lý hồ sơ.");
  };

  const handleExportZipFull = async () => {
    const isNoCarMode = processMode === 'no_car_letter' || processMode === 'auto_generate_cars';
    if (isNoCarMode) {
      if (!coverFile) return alert("Kính mời tải lên Thư Cover ở Bước 1 trước khi xuất dữ liệu.");
    } else {
      if (carFiles.length === 0) return alert("Kính mời chọn danh sách tệp CaR ở Bước 2 trước khi xuất dữ liệu.");
    }

    setIsExporting(true);
    setCurrentStepText(`Đang tải lên ${carFiles.length > 0 ? carFiles.length + ' tệp CaR và ' : ''}Thư Cover sang máy chủ...`);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Mở rộng thời gian chờ lên 10 phút (600s) cho gói hồ sơ lớn
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 600000);

    const formData = new FormData();
    if (coverFile) formData.append('cover_file', coverFile);
    if (!isNoCarMode) {
      carFiles.forEach(file => formData.append('files', file));
    }
    formData.append('mode', processMode);
    formData.append('qti_no', qtiNo.trim());
    formData.append('start_car_no', startCarNo.trim());
    formData.append('custom_date', customDate.trim());
    formData.append('default_status', defaultStatus);

    if (processMode === 'auto_bump') {
      formData.append('metadata', JSON.stringify(carStatuses));
    } else {
      formData.append('metadata', JSON.stringify({})); 
    }

    try {
      setCurrentStepText('Máy chủ đang xử lý nhân bản các Round, khớp danh mục bản vẽ và tạo 2 Thư Word...');

      const response = await fetch('https://toannguyen-autooffice.onrender.com/api/export-zip-full', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      setCurrentStepText('Đang hoàn tất tệp nén ZIP và tải về máy tính...');

      try {
        const itemsHeader = response.headers.get('X-Processed-Items');
        if (itemsHeader) {
          const jsonStr = decodeURIComponent(escape(atob(itemsHeader)));
          setProcessedResults(JSON.parse(jsonStr));
        }
      } catch (hErr) {
        console.warn("Bỏ qua đọc header danh sách:", hErr);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      
      const safeQtiName = qtiNo.replace(/[\\/*?:"<>|]/g, '-').trim();
      downloadLink.download = `${safeQtiName}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      setCurrentStepText('Đã xuất thành công toàn bộ hồ sơ!');
    } catch (err) {
      if (err.name === 'AbortError') {
        alert("Tiến trình đã được dừng lại theo yêu cầu.");
      } else {
        alert("Thông báo từ hệ thống: " + err.message);
      }
      setCurrentStepText('');
    } finally {
      setIsExporting(false);
    }
  };

  const isExportDisabled = isExporting || (
    (processMode === 'no_car_letter' || processMode === 'auto_generate_cars') ? !coverFile : carFiles.length === 0
  );

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      color: '#1e293b'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '14px',
            padding: '6px 12px',
            borderRadius: '6px'
          }}>
            PECC1
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
              HỆ THỐNG QUẢN LÝ VÀ XỬ LÝ HỒ SƠ CÔNG VĂN - DỰ ÁN QUẢNG TRẠCH 1
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Tự động hóa bóc tách Transmittal, lập phiếu CaR và phát hành thư phê duyệt
            </p>
          </div>
        </div>
        <div style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#cbd5e1',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          padding: '6px 14px',
          borderRadius: '20px'
        }}>
          Dự án QT1 • Phiên bản 2026
        </div>
      </header>

      {/* KHU VỰC TIẾN TRÌNH XỬ LÝ ĐƯA LÊN ĐẦU TRANG */}
      <div style={{ maxWidth: '1600px', margin: '16px auto 0 auto', padding: '0 20px' }}>
        {isExporting ? (
          <div style={{
            backgroundColor: '#ffffff',
            border: '2px solid #0284c7',
            borderRadius: '12px',
            padding: '16px 24px',
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>⏳</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                  ĐANG TIẾN HÀNH XỬ LÝ HỒ SƠ ({elapsedSeconds} giây)
                </span>
              </div>
              <button 
                type="button" 
                onClick={handleCancelExport} 
                style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕ Hủy tiến trình
              </button>
            </div>
            
            <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '100%',
                backgroundColor: '#0284c7',
                height: '100%',
                backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent)',
                backgroundSize: '30px 30px'
              }}></div>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>
              {currentStepText}
            </div>
          </div>
        ) : (
          currentStepText && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '12px 20px',
              color: '#166534',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>✓ {currentStepText}</span>
              <button 
                onClick={() => setCurrentStepText('')} 
                style={{ border: 'none', background: 'transparent', color: '#166534', cursor: 'pointer', fontWeight: 'bold' }}
              >✕</button>
            </div>
          )
        )}
      </div>

      {/* VÙNG LÀM VIỆC CHÍNH 3 CỘT */}
      <main style={{
        maxWidth: '1600px',
        margin: '16px auto 24px auto',
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: '320px 1fr 340px',
        gap: '20px',
        alignItems: 'start'
      }}>
        
        {/* CỘT 1 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e0f2fe',
              color: '#0369a1', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>1</span>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Thư Cover EPC Đệ Trình
            </h2>
          </div>

          <label style={{
            display: 'block', border: '2px dashed #cbd5e1', borderRadius: '8px',
            padding: '18px 12px', textAlign: 'center', backgroundColor: '#f8fafc',
            cursor: 'pointer', marginBottom: '12px'
          }}>
            <input type="file" accept=".pdf,.xlsx,.xls" onChange={handleCoverChange} style={{ display: 'none' }} />
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>📄</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7' }}>
              Chọn tệp Thư Cover (.pdf, .xlsx)
            </div>
          </label>

          {coverFile && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 10px',
              borderRadius: '6px', fontSize: '11px', color: '#166534', marginBottom: '14px',
              wordBreak: 'break-all'
            }}>
              ✓ Đã nạp: <b>{coverFile.name}</b>
            </div>
          )}

          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Ngày phát hành công văn (Tùy chọn):
            </label>
            <input 
              type="text" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)} 
              placeholder="Hệ thống tự đọc từ Cover"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                fontSize: '12px', color: '#0f172a', boxSizing: 'border-box'
              }}
            />
            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              * Mặc định hệ thống tự đọc chính xác ngày trên Cover.
            </span>
          </div>
        </section>

        {/* CỘT 2 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#ccfbf1',
                color: '#0f766e', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>2</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                Phương Thức Xử Lý & Hồ Sơ CaR
              </h2>
            </div>

            {carFiles.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 10px', borderRadius: '12px' }}>
                Đã nạp {carFiles.length} tệp CaR
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            
            <div 
              onClick={() => setProcessMode('auto_bump')}
              style={{
                padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                border: processMode === 'auto_bump' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'auto_bump' ? '#f5f3ff' : '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === 'auto_bump' ? '#6d28d9' : '#0f172a' }}>
                🔄 Tạo Round tiếp theo (R+1)
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Nhân bản Sheet, tăng Round, giữ lịch sử nhận xét
              </div>
            </div>

            <div 
              onClick={() => setProcessMode('number_filled_cars')}
              style={{
                padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                border: processMode === 'number_filled_cars' ? '2px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'number_filled_cars' ? '#f0fdfa' : '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === 'number_filled_cars' ? '#0f766e' : '#0f172a' }}>
                📝 Cấp số CaR có nhận xét
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Kỹ sư đã điền ý kiến; cấp số E1 và nhận diện status
              </div>
            </div>

            <div 
              onClick={() => setProcessMode('auto_generate_cars')}
              style={{
                padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                border: processMode === 'auto_generate_cars' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'auto_generate_cars' ? '#f0f9ff' : '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === 'auto_generate_cars' ? '#0369a1' : '#0f172a' }}>
                ✨ Tự tạo CaR từ Thư Cover
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Tự động tạo toàn bộ CaR R1 theo Cover (không nạp CaR)
              </div>
            </div>

            <div 
              onClick={() => setProcessMode('pre_prepared')}
              style={{
                padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                border: processMode === 'pre_prepared' ? '2px solid #475569' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'pre_prepared' ? '#f8fafc' : '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === 'pre_prepared' ? '#1e293b' : '#0f172a' }}>
                📁 Trích xuất Thư từ CaR có sẵn
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                CaR đã hoàn thiện, chỉ đọc để xuất 2 Thư Word
              </div>
            </div>

            <div 
              onClick={() => setProcessMode('no_car_letter')}
              style={{
                gridColumn: 'span 2', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                border: processMode === 'no_car_letter' ? '2px solid #475569' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'no_car_letter' ? '#f8fafc' : '#ffffff'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === 'no_car_letter' ? '#1e293b' : '#0f172a' }}>
                ✉️ Phúc đáp công văn (Không kèm CaR)
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Chỉ tạo 2 Thư Word trả lời nội dung công văn của EPC
              </div>
            </div>

          </div>

          {(processMode === 'auto_generate_cars' || processMode === 'number_filled_cars') && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#f8fafc',
              padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Số CaR bắt đầu:
                </label>
                <input 
                  type="number" 
                  value={startCarNo} 
                  onChange={(e) => setStartCarNo(e.target.value)} 
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: '#0284c7' }}
                />
              </div>

              {processMode === 'auto_generate_cars' && (
                <div style={{ flex: 1.4 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Kết quả đánh giá mặc định:
                  </label>
                  <select 
                    value={defaultStatus} 
                    onChange={(e) => setDefaultStatus(e.target.value)} 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '12px' }}
                  >
                    <option value="APP">APPROVED (APP)</option>
                    <option value="RFC">RETURN FOR CORRECTIONS (RFC)</option>
                    <option value="AWC">APPROVED WITH COMMENTS (AWC)</option>
                    <option value="RJ">REJECTED (RJ)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {(processMode === 'number_filled_cars' || processMode === 'auto_bump' || processMode === 'pre_prepared') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px dashed #0d9488',
                  borderRadius: '6px', padding: '6px 14px', backgroundColor: '#f0fdfa', cursor: 'pointer',
                  fontSize: '12px', fontWeight: '700', color: '#0f766e'
                }}>
                  <input type="file" multiple accept=".xlsx,.xls" onChange={handleCarFilesChange} style={{ display: 'none' }} />
                  <span>+ Thêm tệp CaR từ máy tính</span>
                </label>

                {processMode === 'auto_bump' && carFiles.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Đổi tất cả:</span>
                    <button 
                      type="button" 
                      onClick={() => handleBatchStatusApply('APP')} 
                      style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', cursor: 'pointer' }}
                    >
                      APP
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleBatchStatusApply('RFC')} 
                      style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}
                    >
                      RFC
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleBatchStatusApply('AWC')} 
                      style={{ padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #fde047', backgroundColor: '#fefce8', color: '#854d0e', cursor: 'pointer' }}
                    >
                      AWC
                    </button>
                  </div>
                )}
              </div>

              {carFiles.length > 0 && (
                <div style={{
                  maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px',
                  backgroundColor: '#ffffff'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '7px 10px', width: '30px' }}>STT</th>
                        <th style={{ padding: '7px 10px' }}>Tên tệp CaR</th>
                        <th style={{ padding: '7px 10px', width: '110px' }}>Trạng thái</th>
                        <th style={{ padding: '7px 10px', width: '30px', textAlign: 'center' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carFiles.map((file, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', fontWeight: '500', color: '#1e293b', wordBreak: 'break-all' }} title={file.name}>
                            {file.name}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            {processMode === 'auto_bump' ? (
                              <select 
                                value={carStatuses[file.name] || 'APP'} 
                                onChange={(e) => handleStatusChange(file.name, e.target.value)} 
                                style={{
                                  padding: '3px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '11px',
                                  border: '1px solid #cbd5e1',
                                  color: carStatuses[file.name] === 'RFC' ? '#991b1b' : '#166534'
                                }}
                              >
                                <option value="APP">APP</option>
                                <option value="RFC">RFC</option>
                                <option value="AWC">AWC</option>
                                <option value="RJ">RJ</option>
                              </select>
                            ) : (
                              <span style={{ fontWeight: '700', color: '#0f766e', backgroundColor: '#ccfbf1', padding: '2px 6px', borderRadius: '4px' }}>
                                Tự đọc
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCarFile(idx)} 
                              style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
                              title="Xóa tệp này"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* CỘT 3 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#dcfce7',
              color: '#15803d', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>3</span>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
              Kết Quả & Phát Hành
            </h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              Số hiệu văn bản phát hành:
            </label>
            <input 
              type="text" 
              value={qtiNo} 
              onChange={(e) => setQtiNo(e.target.value)} 
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                fontSize: '13px', fontWeight: '700', color: '#0f172a', boxSizing: 'border-box'
              }} 
            />
          </div>

          <button 
            onClick={handleExportZipFull} 
            disabled={isExportDisabled} 
            style={{
              width: '100%',
              background: isExportDisabled ? '#cbd5e1' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: isExportDisabled ? 'not-allowed' : 'pointer',
              marginBottom: '14px',
              boxShadow: isExportDisabled ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.25)'
            }}
          >
            {isExporting 
              ? `Đang xử lý (${elapsedSeconds} giây)...` 
              : (processMode === 'no_car_letter' ? 'XUẤT 2 THƯ WORD (ZIP)' : 'XUẤT TRỌN BỘ HỒ SƠ (ZIP)')}
          </button>
          
          {processedResults.length > 0 && (
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Hồ sơ đã xử lý thành công:
              </div>
              {processedResults.map((res, idx) => (
                <div key={idx} style={{
                  backgroundColor: res.status.includes('APP') || res.status.includes('REVIEWED') ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${res.status.includes('APP') || res.status.includes('REVIEWED') ? '#bbf7d0' : '#fecaca'}`,
                  padding: '8px 10px', borderRadius: '6px', marginBottom: '6px', fontSize: '11px'
                }}>
                  <p style={{ margin: '0 0 2px 0', wordBreak: 'break-all', color: '#0f172a' }}>
                    <strong>Mã:</strong> {res.doc_no}
                  </p>
                  <p style={{ margin: '0 0 2px 0', color: '#0284c7', wordBreak: 'break-all' }}>
                    <strong>Tệp:</strong> {res.assigned_car}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Kết quả:</strong> <span style={{
                      fontWeight: '700',
                      color: res.status.includes('APP') || res.status.includes('REVIEWED') ? '#166534' : '#991b1b'
                    }}>{res.status}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
