import React, { useState, useRef } from 'react';

function App() {
  const [coverFile, setCoverFile] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [carFiles, setCarFiles] = useState([]);
  const [carStatuses, setCarStatuses] = useState({});
  const [defaultStatus, setDefaultStatus] = useState('APP');
  const [processedResults, setProcessedResults] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState('');
  const [processMode, setProcessMode] = useState('auto_bump');
  const [startCarNo, setStartCarNo] = useState('9905');
  const [qtiNo, setQtiNo] = useState('QTI-PECC1-PMB2-26-10-155');

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);

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

  const setAllStatuses = (status) => {
    const updated = {};
    carFiles.forEach(f => { updated[f.name] = status; });
    setCarStatuses(updated);
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsExporting(false);
    setCurrentProcessingFile('');
    setElapsedSeconds(0);
  };

  const handleExportZipFull = async () => {
    const isNoCarMode = processMode === 'no_car_letter' || processMode === 'auto_generate_cars';
    if (isNoCarMode) {
      if (!coverFile) return alert("Kính mời tải lên Thư Cover ở Bước 1 trước khi thực hiện.");
    } else {
      if (carFiles.length === 0) return alert("Kính mời chọn danh sách tệp CaR từ máy tính trước khi thực hiện.");
    }

    setIsExporting(true);
    setElapsedSeconds(0);
    setCurrentProcessingFile('Hệ thống đang tải tệp và gửi yêu cầu tới máy chủ xử lý...');

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

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

    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 90000);

    try {
      const response = await fetch('https://toannguyen-autooffice.onrender.com/api/export-zip-full', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      setCurrentProcessingFile('Đang nhận và lưu trữ tệp kết quả...');

      try {
        const itemsHeader = response.headers.get('X-Processed-Items');
        if (itemsHeader) {
          const jsonStr = decodeURIComponent(escape(atob(itemsHeader)));
          setProcessedResults(JSON.parse(jsonStr));
        }
      } catch (hErr) {
        console.warn("Bỏ qua đọc danh mục tệp đính kèm:", hErr);
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
      setCurrentProcessingFile('Đã hoàn tất xử lý và tải bộ hồ sơ về máy tính.');
    } catch (err) {
      if (err.name === 'AbortError') {
        alert("Thông báo: Quá trình gửi tệp đã vượt quá thời gian cho phép (90 giây) hoặc đã được chủ động dừng lại.");
      } else {
        alert("Thông báo từ hệ thống: " + err.message);
      }
      setCurrentProcessingFile('');
    } finally {
      clearTimeout(timeoutId);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsExporting(false);
    }
  };

  const isExportDisabled = isExporting || (
    (processMode === 'no_car_letter' || processMode === 'auto_generate_cars') ? !coverFile : carFiles.length === 0
  );

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      backgroundColor: '#f1f5f9',
      minHeight: '100vh',
      color: '#0f172a'
    }}>
      {/* Header hệ thống */}
      <header style={{
        backgroundColor: '#0f172a',
        padding: '16px 36px',
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
            padding: '5px 12px',
            borderRadius: '6px'
          }}>PECC1</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
              HỆ THỐNG QUẢN LÝ VÀ XỬ LÝ HỒ SƠ CÔNG VĂN - DỰ ÁN QUẢNG TRẠCH 1
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Bóc tách Transmittal, tạo phiếu CaR và phát hành hồ sơ phê duyệt
            </p>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', backgroundColor: '#1e293b', padding: '6px 14px', borderRadius: '20px' }}>
          Dự án QT1 • Phiên bản 2026
        </div>
      </header>

      {/* Vùng làm việc chính dạng 2 bảng thông thoáng */}
      <main style={{
        maxWidth: '1650px',
        margin: '20px auto',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* BẢNG TRÁI: THIẾT LẬP QUY TRÌNH & THƯ COVER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: Thư Cover */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>1</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Thư Cover EPC Đệ Trình</h2>
            </div>

            <label style={{
              display: 'block',
              border: '2px dashed #94a3b8',
              borderRadius: '8px',
              padding: '14px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              marginBottom: '10px'
            }}>
              <input type="file" accept=".pdf,.xlsx,.xls" onChange={handleCoverChange} style={{ display: 'none' }} />
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0284c7' }}>Bấm để chọn tệp Thư Cover (.pdf, .xlsx)</div>
            </label>

            {coverFile && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', color: '#166534', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                ✓ Đã tiếp nhận: <b>{coverFile.name}</b>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Ngày phát hành công văn (Tùy chọn):
              </label>
              <input 
                type="text" 
                value={customDate} 
                onChange={(e) => setCustomDate(e.target.value)} 
                placeholder="Để trống để hệ thống tự nhận diện"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Card 2: 5 Phương thức xử lý */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>2</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Phương Thức Xử Lý</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'auto_generate_cars', title: '1. Tự động tạo CaR từ Thư Cover', desc: 'Không cần tệp CaR; hệ thống tự tạo toàn bộ CaR R1 từ danh mục đệ trình' },
                { id: 'number_filled_cars', title: '2. Cấp số cho CaR đã có ý kiến', desc: 'Cấp số mới tại ô E1, xóa bôi vàng và bảo toàn nội dung kỹ sư đã ghi' },
                { id: 'auto_bump', title: '3. Tạo Round soát xét tiếp theo (R+1)', desc: 'Tạo Round mới, nâng đợt đánh giá và lưu trữ toàn bộ lịch sử phản hồi' },
                { id: 'pre_prepared', title: '4. Trích xuất Thư từ bộ CaR hoàn thiện', desc: 'Đóng gói các tệp CaR hoàn tất và trích xuất dữ liệu để tạo 2 Thư Word' },
                { id: 'no_car_letter', title: '5. Phúc đáp công văn (Không kèm CaR)', desc: 'Trả lời công văn thuần túy; chỉ tạo 2 Thư Word gửi Chủ đầu tư và Nhà thầu' }
              ].map(item => (
                <div 
                  key={item.id}
                  onClick={() => setProcessMode(item.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: processMode === item.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    backgroundColor: processMode === item.id ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input 
                      type="radio" 
                      name="mode" 
                      value={item.id} 
                      checked={processMode === item.id} 
                      onChange={() => setProcessMode(item.id)} 
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: processMode === item.id ? '#0369a1' : '#1e293b' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Thông tin phát hành */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '18px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>3</span>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Thông Tin Phát Hành</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Số hiệu văn bản PECC1 phát hành:
                </label>
                <input 
                  type="text" 
                  value={qtiNo} 
                  onChange={(e) => setQtiNo(e.target.value)} 
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', boxSizing: 'border-box' }} 
                />
              </div>

              {(processMode === 'auto_generate_cars' || processMode === 'number_filled_cars') && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Số CaR bắt đầu:
                  </label>
                  <input 
                    type="number" 
                    value={startCarNo} 
                    onChange={(e) => setStartCarNo(e.target.value)} 
                    placeholder="Ví dụ: 9905"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#0284c7', boxSizing: 'border-box' }} 
                  />
                </div>
              )}

              {processMode === 'auto_generate_cars' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Kết quả đánh giá mặc định:
                  </label>
                  <select 
                    value={defaultStatus} 
                    onChange={(e) => setDefaultStatus(e.target.value)} 
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '12px', boxSizing: 'border-box' }}
                  >
                    <option value="APP">APPROVED (APP) - Chấp thuận</option>
                    <option value="RFC">RETURN FOR CORRECTIONS (RFC) - Trả về chỉnh sửa</option>
                    <option value="AWC">APPROVED WITH COMMENTS (AWC) - Chấp thuận có ý kiến</option>
                    <option value="RJ">REJECTED (RJ) - Từ chối</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BẢNG PHẢI: KHÔNG GIAN LÀM VIỆC & DANH SÁCH TÀI LIỆU RỘNG RÃI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '22px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            {/* Thanh tiêu đề & Công cụ nhanh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  Danh Sách Tệp CaR Cần Xử Lý
                </h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {processMode === 'auto_generate_cars' 
                    ? 'Chế độ tự động: Danh mục tài liệu được bóc tách trực tiếp từ Thư Cover' 
                    : (processMode === 'no_car_letter' 
                        ? 'Chế độ phúc đáp công văn: Không sử dụng tệp CaR' 
                        : `Đang có ${carFiles.length} tệp CaR được chọn`)}
                </span>
              </div>

              {processMode === 'auto_bump' && carFiles.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setAllStatuses('APP')}
                    style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Tất cả là APP
                  </button>
                  <button 
                    onClick={() => setAllStatuses('RFC')}
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Tất cả là RFC
                  </button>
                </div>
              )}
            </div>

            {/* Ô nạp tệp CaR dạng ngang rộng rãi */}
            {(processMode === 'number_filled_cars' || processMode === 'auto_bump' || processMode === 'pre_prepared') && (
              <label style={{
                display: 'block',
                border: '2px dashed #0284c7',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f0f9ff',
                cursor: 'pointer',
                marginBottom: '16px'
              }}>
                <input type="file" multiple accept=".xlsx,.xls" onChange={handleCarFilesChange} style={{ display: 'none' }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0369a1' }}>
                  Bấm để chọn các tệp CaR từ máy tính (Có thể chọn cùng lúc nhiều tệp)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Hỗ trợ định dạng bảng tính Excel (.xlsx, .xls)
                </div>
              </label>
            )}

            {/* Bảng danh sách tệp rộng rãi, hiển thị tên đầy đủ */}
            {carFiles.length > 0 && (processMode === 'number_filled_cars' || processMode === 'auto_bump' || processMode === 'pre_prepared') && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 14px', width: '40px' }}>STT</th>
                      <th style={{ padding: '10px 14px' }}>Tên tệp CaR</th>
                      {processMode === 'auto_bump' && <th style={{ padding: '10px 14px', width: '110px' }}>Đợt soát xét</th>}
                      <th style={{ padding: '10px 14px', width: '150px' }}>Kết quả đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carFiles.map((file, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '500', color: '#0f172a', wordBreak: 'break-all' }}>
                          {file.name}
                        </td>
                        {processMode === 'auto_bump' && (
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px' }}>
                              Tạo Round mới
                            </span>
                          </td>
                        )}
                        <td style={{ padding: '12px 14px' }}>
                          {processMode === 'auto_bump' ? (
                            <select 
                              value={carStatuses[file.name] || 'APP'} 
                              onChange={(e) => handleStatusChange(file.name, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: '700',
                                fontSize: '12px',
                                color: (carStatuses[file.name] || 'APP') === 'APP' ? '#166534' : '#991b1b',
                                backgroundColor: (carStatuses[file.name] || 'APP') === 'APP' ? '#f0fdf4' : '#fef2f2'
                              }}
                            >
                              <option value="APP">APPROVED (APP)</option>
                              <option value="RFC">RETURN FOR CORRECTIONS (RFC)</option>
                              <option value="AWC">APPROVED WITH COMMENTS (AWC)</option>
                              <option value="RJ">REJECTED (RJ)</option>
                            </select>
                          ) : (
                            <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '11px' }}>
                              Tự động nhận diện
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Khung điều khiển xuất hồ sơ & tiến độ */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: isExporting ? '14px' : '0' }}>
                <button 
                  onClick={handleExportZipFull} 
                  disabled={isExportDisabled} 
                  style={{
                    flex: 1,
                    backgroundColor: isExportDisabled ? '#94a3b8' : '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 24px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: isExportDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isExportDisabled ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  {isExporting 
                    ? `Hệ thống đang xử lý (${elapsedSeconds}s)...` 
                    : (processMode === 'no_car_letter' ? 'XUẤT 2 THƯ WORD (ZIP)' : 'XUẤT TRỌN BỘ HỒ SƠ PHÁT HÀNH (ZIP)')}
                </button>

                {isExporting && (
                  <button 
                    onClick={handleCancelExport}
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      color: '#991b1b',
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    HỦY TIẾN TRÌNH
                  </button>
                )}
              </div>

              {isExporting && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                    <span>{currentProcessingFile}</span>
                    <span style={{ fontWeight: '700', color: '#0284c7' }}>{elapsedSeconds} giây</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(10 + elapsedSeconds * 5, 95)}%`, backgroundColor: '#16a34a', height: '100%', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách tệp đã phát hành */}
            {processedResults.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
                  Hồ sơ đã xử lý hoàn tất:
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {processedResults.map((res, idx) => (
                    <div key={idx} style={{
                      backgroundColor: res.status.includes('APP') || res.status.includes('REVIEWED') ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${res.status.includes('APP') || res.status.includes('REVIEWED') ? '#bbf7d0' : '#fecaca'}`,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{res.doc_no}</div>
                      <div style={{ color: '#0284c7', margin: '2px 0' }}>Tệp phát hành: <b>{res.assigned_car}</b></div>
                      <div style={{ fontWeight: '700', color: res.status.includes('APP') ? '#166534' : '#991b1b' }}>
                        Đánh giá: {res.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
