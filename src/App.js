import React, { useState } from 'react';

function App() {
  const [coverFile, setCoverFile] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [carFiles, setCarFiles] = useState([]);
  const [carStatuses, setCarStatuses] = useState({});
  const [defaultStatus, setDefaultStatus] = useState('APP');
  const [processedResults, setProcessedResults] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState('');
  const [processMode, setProcessMode] = useState('auto_generate_cars');
  const [startCarNo, setStartCarNo] = useState('9905');
  const [qtiNo, setQtiNo] = useState('QTI-PECC1-PMB2-26-10-147');

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

  const handleStatusChange = (fileName, status) => {
    setCarStatuses(prev => ({ ...prev, [fileName]: status }));
  };

  const handleExportZipFull = async () => {
    const isNoCarMode = processMode === 'no_car_letter' || processMode === 'auto_generate_cars';
    if (isNoCarMode) {
      if (!coverFile) return alert("Kính mời tải lên Thư Cover ở Bước 1 trước khi xuất dữ liệu.");
    } else {
      if (carFiles.length === 0) return alert("Kính mời chọn danh sách tệp CaR ở Bước 2 trước khi xuất dữ liệu.");
    }

    setIsExporting(true);
    setProgress(15);
    setCurrentProcessingFile('Hệ thống đang trích xuất danh mục tài liệu và ngày phát hành từ Thư Cover...');

    if (processMode === 'auto_generate_cars') {
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(45);
      setCurrentProcessingFile(`Đang tự động khởi tạo các tệp CaR mới từ số ${startCarNo}...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(75);
      setCurrentProcessingFile('Đang đồng bộ nội dung Tờ trình tiếng Việt và Thư tiếng Anh...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(90);
    } else if (processMode === 'no_car_letter') {
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(50);
      setCurrentProcessingFile('Đang khởi tạo Tờ trình tiếng Việt và Thư tiếng Anh...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(85);
    } else {
      const totalFiles = carFiles.length;
      for (let i = 0; i < totalFiles; i++) {
        let msg = `Đang xử lý tệp: ${carFiles[i].name}`;
        if (processMode === 'number_filled_cars') {
          const assigned = parseInt(startCarNo || 0) + i;
          msg = `Đang nhận diện ý kiến và cấp số ${assigned}: ${carFiles[i].name}`;
        } else if (processMode === 'pre_prepared') {
          msg = `Đang trích xuất dữ liệu từ tệp hoàn thiện: ${carFiles[i].name}`;
        } else if (processMode === 'auto_bump') {
          msg = `Đang nhân bản và tạo Round soát xét mới: ${carFiles[i].name}`;
        }
        setCurrentProcessingFile(msg);
        setProgress(15 + Math.round(((i + 1) / totalFiles) * 70));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      setProgress(90);
    }

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
      const response = await fetch('https://toannguyen-autooffice.onrender.com/api/export-zip-full', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      try {
        const itemsHeader = response.headers.get('X-Processed-Items');
        if (itemsHeader) {
          const jsonStr = decodeURIComponent(escape(atob(itemsHeader)));
          setProcessedResults(JSON.parse(jsonStr));
        }
      } catch (hErr) {
        console.warn("Bỏ qua thông tin danh sách tệp đính kèm:", hErr);
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
      
      setProgress(100);
      setCurrentProcessingFile('Đã hoàn tất xử lý và xuất bộ hồ sơ thành công.');
    } catch (err) {
      alert("Thông báo từ hệ thống: " + err.message);
      setProgress(0);
      setCurrentProcessingFile('');
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
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      color: '#1e293b'
    }}>
      {/* Header thanh lịch */}
      <header style={{
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '15px',
            padding: '6px 12px',
            borderRadius: '8px',
            letterSpacing: '1px'
          }}>
            PECC1
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.3px' }}>
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
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Dự án QT1 • Phiên bản 2026
        </div>
      </header>

      {/* Vùng làm việc chính 3 cột */}
      <main style={{
        maxWidth: '1600px',
        margin: '24px auto',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1.35fr 1.15fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* CỘT 1 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: '700',
              fontSize: '13px'
            }}>1</span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              Thư Cover EPC Đệ trình
            </h2>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginTop: 0, marginBottom: '14px' }}>
            Kính mời tải lên Thư Cover từ Nhà thầu EPC ở định dạng tệp <b>.pdf</b> hoặc <b>.xlsx</b>:
          </p>

          <label style={{
            display: 'block',
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '22px 16px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '14px'
          }}>
            <input type="file" accept=".pdf,.xlsx,.xls" onChange={handleCoverChange} style={{ display: 'none' }} />
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>📄</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0284c7' }}>
              Bấm để chọn tệp Thư Cover
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Hỗ trợ tệp PDF hoặc bảng tính Excel
            </div>
          </label>

          {coverFile && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px'
            }}>
              <span>✓</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Đã tiếp nhận: <b>{coverFile.name}</b>
              </span>
            </div>
          )}

          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            padding: '14px',
            border: '1px solid #e2e8f0'
          }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Ngày phát hành công văn (Tùy chọn):
            </label>
            <input 
              type="text" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)} 
              placeholder="Để trống để hệ thống tự nhận diện từ Cover"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff'
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
              * Mặc định hệ thống tự động bóc tách chính xác ngày ghi trên Thư Cover.
            </span>
          </div>
        </section>

        {/* CỘT 2 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#ccfbf1',
              color: '#0f766e',
              fontWeight: '700',
              fontSize: '13px'
            }}>2</span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              Phương Thức Xử Lý Hồ Sơ
            </h2>
          </div>

          {/* Danh sách 5 phương thức dạng Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            
            {/* Phương thức 1 */}
            <div 
              onClick={() => setProcessMode('auto_generate_cars')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: processMode === 'auto_generate_cars' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'auto_generate_cars' ? '#f0f9ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="auto_generate_cars" 
                  checked={processMode === 'auto_generate_cars'} 
                  onChange={() => setProcessMode('auto_generate_cars')} 
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: processMode === 'auto_generate_cars' ? '#0369a1' : '#0f172a' }}>
                    1. Tự động tạo CaR từ Thư Cover
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Chỉ cần tải lên Thư Cover ở Bước 1; hệ thống tự động trích xuất danh mục và tạo toàn bộ tệp CaR Round 1 theo mẫu lưu sẵn.
                  </div>
                </div>
              </div>
            </div>

            {/* Phương thức 2 */}
            <div 
              onClick={() => setProcessMode('number_filled_cars')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: processMode === 'number_filled_cars' ? '2px solid #0d9488' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'number_filled_cars' ? '#f0fdfa' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="number_filled_cars" 
                  checked={processMode === 'number_filled_cars'} 
                  onChange={() => setProcessMode('number_filled_cars')} 
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: processMode === 'number_filled_cars' ? '#0f766e' : '#0f172a' }}>
                    2. Cấp số cho CaR đã có ý kiến kỹ sư
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Dành cho tệp kỹ sư đã ghi nhận xét; hệ thống cấp số mới tại ô E1, xóa màu nền vàng và giữ nguyên toàn bộ ý kiến đánh giá.
                  </div>
                </div>
              </div>
            </div>

            {/* Phương thức 3 */}
            <div 
              onClick={() => setProcessMode('auto_bump')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: processMode === 'auto_bump' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'auto_bump' ? '#f5f3ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="auto_bump" 
                  checked={processMode === 'auto_bump'} 
                  onChange={() => setProcessMode('auto_bump')} 
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: processMode === 'auto_bump' ? '#6d28d9' : '#0f172a' }}>
                    3. Tạo Round soát xét tiếp theo (R+1)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Nhân bản trang tính, nâng số đợt đánh giá và lưu trữ đầy đủ lịch sử phản hồi của các đợt soát xét trước.
                  </div>
                </div>
              </div>
            </div>

            {/* Phương thức 4 */}
            <div 
              onClick={() => setProcessMode('pre_prepared')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: processMode === 'pre_prepared' ? '2px solid #475569' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'pre_prepared' ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="pre_prepared" 
                  checked={processMode === 'pre_prepared'} 
                  onChange={() => setProcessMode('pre_prepared')} 
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: processMode === 'pre_prepared' ? '#1e293b' : '#0f172a' }}>
                    4. Trích xuất Thư từ bộ CaR hoàn thiện
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Bộ tệp CaR đã hoàn tất; hệ thống giữ nguyên các tệp đính kèm và đọc thông tin để tạo 2 Thư Word tương ứng.
                  </div>
                </div>
              </div>
            </div>

            {/* Phương thức 5 */}
            <div 
              onClick={() => setProcessMode('no_car_letter')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: processMode === 'no_car_letter' ? '2px solid #475569' : '1px solid #e2e8f0',
                backgroundColor: processMode === 'no_car_letter' ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input 
                  type="radio" 
                  name="mode" 
                  value="no_car_letter" 
                  checked={processMode === 'no_car_letter'} 
                  onChange={() => setProcessMode('no_car_letter')} 
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: processMode === 'no_car_letter' ? '#1e293b' : '#0f172a' }}>
                    5. Phúc đáp công văn (Không kèm CaR)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                    Trả lời nội dung công văn của EPC; chỉ xuất 2 Thư Word gửi Chủ đầu tư và Nhà thầu mà không kèm tệp CaR.
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Ô cấu hình số bắt đầu & Tình trạng mặc định */}
          {(processMode === 'auto_generate_cars' || processMode === 'number_filled_cars') && (
            <div style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px'
            }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                Số CaR bắt đầu (Tự động tăng dần liên tiếp):
              </label>
              <input 
                type="number" 
                value={startCarNo} 
                onChange={(e) => setStartCarNo(e.target.value)} 
                placeholder="Ví dụ: 9905"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0284c7',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              />

              {processMode === 'auto_generate_cars' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                    Kết quả đánh giá cho các tệp CaR tạo mới:
                  </label>
                  <select 
                    value={defaultStatus} 
                    onChange={(e) => setDefaultStatus(e.target.value)} 
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '700',
                      fontSize: '12px',
                      backgroundColor: '#ffffff',
                      color: defaultStatus === 'APP' ? '#166534' : '#991b1b'
                    }}
                  >
                    <option value="APP">APPROVED (APP) - Chấp thuận</option>
                    <option value="RFC">RETURN FOR CORRECTIONS (RFC) - Trả về chỉnh sửa</option>
                    <option value="AWC">APPROVED WITH COMMENTS (AWC) - Chấp thuận có ý kiến</option>
                    <option value="RJ">REJECTED (RJ) - Từ chối</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Ô tải lên tệp CaR (Chỉ hiện khi cần tệp từ máy) */}
          {(processMode === 'number_filled_cars' || processMode === 'auto_bump' || processMode === 'pre_prepared') && (
            <div>
              <label style={{
                display: 'block',
                border: '2px dashed #0d9488',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: '#f0fdfa',
                cursor: 'pointer',
                marginBottom: '12px'
              }}>
                <input type="file" multiple accept=".xlsx,.xls" onChange={handleCarFilesChange} style={{ display: 'none' }} />
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>📊</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f766e' }}>
                  Bấm để chọn danh sách tệp CaR từ máy tính
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Có thể chọn cùng lúc nhiều tệp Excel (.xlsx, .xls)
                </div>
              </label>

              {carFiles.length > 0 && (
                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '6px',
                  backgroundColor: '#ffffff'
                }}>
                  {carFiles.map((file, idx) => {
                    const assignedNum = parseInt(startCarNo || 0) + idx;
                    const formattedNum = assignedNum < 10000 ? String(assignedNum).padStart(4, '0') : assignedNum;
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '8px 10px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ width: '70%', overflow: 'hidden' }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                            {file.name}
                          </div>
                          {processMode === 'number_filled_cars' && (
                            <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>
                              Số hiệu cấp: {formattedNum} CaR
                            </span>
                          )}
                        </div>
                        
                        {processMode === 'auto_bump' ? (
                          <select 
                            value={carStatuses[file.name] || 'APP'} 
                            onChange={(e) => handleStatusChange(file.name, e.target.value)} 
                            style={{ padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="APP">APP</option>
                            <option value="RFC">RFC</option>
                            <option value="AWC">AWC</option>
                            <option value="RJ">RJ</option>
                          </select>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#0f766e',
                            backgroundColor: '#ccfbf1',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            Tự động nhận diện
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* CỘT 3 */}
        <section style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontWeight: '700',
              fontSize: '13px'
            }}>3</span>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              Kết Quả & Phát Hành Hồ Sơ
            </h2>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Số hiệu văn bản PECC1 phát hành:
            </label>
            <input 
              type="text" 
              value={qtiNo} 
              onChange={(e) => setQtiNo(e.target.value)} 
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '700',
                color: '#0f172a',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff'
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
              padding: '14px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              letterSpacing: '0.2px',
              cursor: isExportDisabled ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              boxShadow: isExportDisabled ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            {isExporting 
              ? `Đang xử lý hồ sơ (${progress}%)...` 
              : (processMode === 'no_car_letter' ? 'XUẤT 2 THƯ WORD (ZIP)' : 'XUẤT TRỌN BỘ HỒ SƠ (ZIP)')}
          </button>
          
          {(isExporting || progress > 0) && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '14px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                <span style={{ color: '#475569' }}>Tiến độ thực hiện:</span>
                <span style={{ color: '#0284c7' }}>{progress}%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  backgroundColor: '#16a34a',
                  height: '100%',
                  transition: 'width 0.25s ease-in-out'
                }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProcessingFile}
              </p>
            </div>
          )}
          
          {processedResults.length > 0 && (
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                Hồ sơ đã xử lý thành công:
              </div>
              {processedResults.map((res, idx) => (
                <div key={idx} style={{
                  backgroundColor: res.status.includes('APP') || res.status.includes('REVIEWED') ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${res.status.includes('APP') || res.status.includes('REVIEWED') ? '#bbf7d0' : '#fecaca'}`,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  <p style={{ margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
                    <strong>Mã văn bản:</strong> {res.doc_no}
                  </p>
                  <p style={{ margin: '0 0 4px 0', color: '#0284c7' }}>
                    <strong>Tệp phát hành:</strong> <b>{res.assigned_car}</b>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Đánh giá:</strong> <span style={{
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
