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
    if (processMode === 'no_car_letter' || processMode === 'auto_generate_cars') {
      if (!coverFile) return alert("Vui lòng nạp Thư Cover ở Cột 1 trước!");
    } else {
      if (carFiles.length === 0) return alert("Vui lòng nạp danh sách file CaRs ở Cột 2 trước!");
    }

    setIsExporting(true);
    setProgress(15);
    setCurrentProcessingFile('Đang bóc tách danh mục tài liệu & Ngày đệ trình từ Thư Cover EPC...');

    if (processMode === 'auto_generate_cars') {
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(40);
      setCurrentProcessingFile(`Đang tự động khởi tạo các file CaRs mới từ số ${startCarNo}...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(75);
      setCurrentProcessingFile('Đang đồng bộ Tờ trình tiếng Việt & Thư tiếng Anh...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(90);
    } else if (processMode === 'no_car_letter') {
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(50);
      setCurrentProcessingFile('Đang sinh Tờ trình TV và Thư tiếng Anh...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(85);
    } else {
      const totalFiles = carFiles.length;
      for (let i = 0; i < totalFiles; i++) {
        let msg = `Đang xử lý: ${carFiles[i].name}`;
        if (processMode === 'number_filled_cars') {
          const assigned = parseInt(startCarNo || 0) + i;
          msg = `Đang đọc tình trạng từ CaR & gán số ${assigned}: ${carFiles[i].name}`;
        } else if (processMode === 'new_cars') {
          const assigned = parseInt(startCarNo || 0) + i;
          msg = `Đang gán số CaR ${assigned} & tạo Round 1: ${carFiles[i].name}`;
        }
        setCurrentProcessingFile(msg);
        setProgress(15 + Math.round(((i + 1) / totalFiles) * 70));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      setProgress(90);
    }

    const formData = new FormData();
    if (coverFile) formData.append('cover_file', coverFile);
    if (processMode !== 'no_car_letter' && processMode !== 'auto_generate_cars') {
      carFiles.forEach(file => formData.append('files', file));
    }
    formData.append('mode', processMode);
    formData.append('qti_no', qtiNo.trim());
    formData.append('start_car_no', startCarNo.trim());
    formData.append('custom_date', customDate.trim());
    formData.append('default_status', defaultStatus);

    if (processMode === 'auto_bump' || processMode === 'new_cars') {
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
      
      setProgress(100);
      setCurrentProcessingFile('Đã xuất trọn bộ hồ sơ thành công!');
    } catch (err) {
      alert("LỖI HỆ THỐNG: " + err.message);
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
    <div style={{ fontFamily: 'Segoe UI, Arial, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px' }}>
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '16px 24px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>QT1 - PECC1 AUTOMATED CaR REVISION SYSTEM</h2>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr 1.15fr', gap: '20px' }}>
        
        {/* CỘT 1 */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ borderBottom: '2px solid #0284c7', paddingBottom: '8px', color: '#0369a1', marginTop: 0 }}>CỘT 1: THƯ COVER SHEET EPC</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Nạp Thư Cover đệ trình từ EPC dạng <b>.pdf</b> hoặc <b>.xlsx</b>:</p>
          <input type="file" accept=".pdf,.xlsx,.xls" onChange={handleCoverChange} style={{ width: '100%', marginBottom: '10px' }} />
          {coverFile && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#166534' }}>Đã nạp: <b>{coverFile.name}</b></div>
          )}

          <div style={{ marginTop: '14px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>
              Ngày công văn EPC (Tùy chọn):
            </label>
            <input 
              type="text" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)} 
              placeholder="Để trống để tự bóc tách từ Cover"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              * Mặc định hệ thống tự đọc chính xác ngày từ file Cover.
            </span>
          </div>
        </div>

        {/* CỘT 2: PHÂN NHÓM CHUYÊN NGHIỆP */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ borderBottom: '2px solid #0d9488', paddingBottom: '8px', color: '#0f766e', marginTop: 0 }}>CỘT 2: QUY TRÌNH XỬ LÝ HỒ SƠ</h3>
          
          <div style={{ marginBottom: '15px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            
            {/* NHÓM 1: ROUND 1 */}
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              📁 Khởi tạo CaR Round 1
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', paddingLeft: '4px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="auto_generate_cars" checked={processMode === 'auto_generate_cars'} onChange={() => setProcessMode('auto_generate_cars')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'auto_generate_cars' ? 'bold' : '500', color: processMode === 'auto_generate_cars' ? '#0284c7' : '#1e293b' }}>
                    Tự động sinh CaR từ Thư Cover
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Chỉ cần nạp Cover ở Cột 1, hệ thống tự tạo toàn bộ CaR R1 chuẩn</div>
                </div>
              </label>

              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="number_filled_cars" checked={processMode === 'number_filled_cars'} onChange={() => setProcessMode('number_filled_cars')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'number_filled_cars' ? 'bold' : '500', color: processMode === 'number_filled_cars' ? '#0f766e' : '#1e293b' }}>
                    Cấp số cho CaR đã có nhận xét
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Kỹ sư đã điền ý kiến, hệ thống cấp số E1 và đọc trạng thái tự động</div>
                </div>
              </label>

              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="new_cars" checked={processMode === 'new_cars'} onChange={() => setProcessMode('new_cars')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'new_cars' ? 'bold' : '500', color: processMode === 'new_cars' ? '#0d9488' : '#1e293b' }}>
                    Điền dữ liệu vào CaR mẫu trắng
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Nạp file mẫu trống để điền thông tin đệ trình & cấp số mới</div>
                </div>
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />

            {/* NHÓM 2: CÁC ROUND TIẾP THEO */}
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              🔄 Soát xét các Round tiếp theo
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', paddingLeft: '4px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="auto_bump" checked={processMode === 'auto_bump'} onChange={() => setProcessMode('auto_bump')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'auto_bump' ? 'bold' : '500', color: processMode === 'auto_bump' ? '#7c3aed' : '#1e293b' }}>
                    Tự động tạo Round tiếp theo (R+1)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Nhân bản Sheet, tăng số Round và lưu giữ toàn bộ lịch sử ý kiến</div>
                </div>
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />

            {/* NHÓM 3: CHỈ PHÁT HÀNH THƯ */}
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              ✉️ Phát hành Thư Cover (Không sửa CaR)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="pre_prepared" checked={processMode === 'pre_prepared'} onChange={() => setProcessMode('pre_prepared')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'pre_prepared' ? 'bold' : '500', color: processMode === 'pre_prepared' ? '#334155' : '#1e293b' }}>
                    Trích xuất Thư từ CaR hoàn thiện
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>CaR đã đầy đủ, chỉ đọc mã tài liệu và tình trạng để xuất 2 Thư Word</div>
                </div>
              </label>

              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start' }}>
                <input type="radio" name="mode" value="no_car_letter" checked={processMode === 'no_car_letter'} onChange={() => setProcessMode('no_car_letter')} style={{ marginTop: '3px', marginRight: '8px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: processMode === 'no_car_letter' ? 'bold' : '500', color: processMode === 'no_car_letter' ? '#334155' : '#1e293b' }}>
                    Phúc đáp công văn thuần túy (Không kèm CaR)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Chỉ xuất 2 Thư Word trả lời nội dung công văn của EPC</div>
                </div>
              </label>
            </div>

            {/* HỘP NHẬP SỐ HIỆU CARS */}
            {(processMode === 'auto_generate_cars' || processMode === 'number_filled_cars' || processMode === 'new_cars') && (
              <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>
                  Nhập số CaRs bắt đầu (Tự tăng liên tiếp):
                </label>
                <input 
                  type="number" 
                  value={startCarNo} 
                  onChange={(e) => setStartCarNo(e.target.value)} 
                  placeholder="Ví dụ: 9905"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #93c5fd', fontSize: '13px', fontWeight: 'bold', boxSizing: 'border-box' }}
                />

                {processMode === 'auto_generate_cars' && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>
                      Tình trạng duyệt mặc định cho CaR tạo mới:
                    </label>
                    <select 
                      value={defaultStatus} 
                      onChange={(e) => setDefaultStatus(e.target.value)} 
                      style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #93c5fd', fontWeight: 'bold', fontSize: '12px' }}
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
          </div>

          {/* Ô NẠP FILE (ẨN ĐI KHI CHỌN CHẾ ĐỘ TỰ SINH HOẶC CHỈ XUẤT THƯ) */}
          {processMode !== 'no_car_letter' && processMode !== 'auto_generate_cars' && (
            <>
              <input type="file" multiple accept=".xlsx,.xls" onChange={handleCarFilesChange} style={{ width: '100%', marginBottom: '15px' }} />
              
              {carFiles.length > 0 && (
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '15px' }}>
                  {carFiles.map((file, idx) => {
                    const assignedNum = parseInt(startCarNo || 0) + idx;
                    const formattedNum = assignedNum < 10000 ? String(assignedNum).padStart(4, '0') : assignedNum;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '8px', marginBottom: '6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '70%', overflow: 'hidden' }}>
                          <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                            {file.name}
                          </div>
                          <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 'bold' }}>
                            Mã gán: {formattedNum} CaRs
                          </span>
                        </div>
                        
                        {processMode === 'auto_bump' || processMode === 'new_cars' ? (
                          <select 
                            value={carStatuses[file.name] || 'APP'} 
                            onChange={(e) => handleStatusChange(file.name, e.target.value)} 
                            style={{ padding: '4px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="APP">APP</option>
                            <option value="RFC">RFC</option>
                            <option value="AWC">AWC</option>
                            <option value="RJ">RJ</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 'bold', padding: '4px 8px', backgroundColor: '#ccfbf1', borderRadius: '4px', border: '1px solid #99f6e4' }}>
                            Tự đọc từ CaR
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* CỘT 3 */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ borderBottom: '2px solid #16a34a', paddingBottom: '8px', color: '#15803d', marginTop: 0 }}>CỘT 3: KẾT QUẢ & XUẤT HỒ SƠ</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#0f766e', marginBottom: '6px' }}>
              Số Ref/Tên file xuất (Tùy chỉnh):
            </label>
            <input 
              type="text" 
              value={qtiNo} 
              onChange={(e) => setQtiNo(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold', color: '#0f172a', boxSizing: 'border-box' }} 
            />
          </div>

          <button onClick={handleExportZipFull} disabled={isExportDisabled} style={{ width: '100%', backgroundColor: isExportDisabled ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', padding: '13px', borderRadius: '6px', fontWeight: 'bold', cursor: isExportDisabled ? 'not-allowed' : 'pointer', marginBottom: '15px' }}>
            {isExporting ? `ĐANG XỬ LÝ (${progress}%)...` : (processMode === 'no_car_letter' ? 'XUẤT ZIP 2 THƯ WORD' : 'XUẤT ZIP BỘ HỒ SƠ D OFFICE')}
          </button>
          
          {(isExporting || progress > 0) && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                <span>Tiến độ xử lý:</span><span style={{ color: '#2563eb' }}>{progress}%</span>
              </div>
              <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, backgroundColor: '#16a34a', height: '100%', transition: 'width 0.2s ease-in-out' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '8px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentProcessingFile}</p>
            </div>
          )}
          
          {processedResults.length > 0 && (
            <div style={{ maxHeight: '330px', overflowY: 'auto' }}>
              {processedResults.map((res, idx) => (
                <div key={idx} style={{ backgroundColor: res.status.includes('APP') || res.status.includes('REVIEWED') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res.status.includes('APP') || res.status.includes('REVIEWED') ? '#bbf7d0' : '#fecaca'}`, padding: '10px', borderRadius: '6px', marginBottom: '8px', fontSize: '12px' }}>
                  <p style={{ margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Mã:</strong> {res.doc_no}</p>
                  <p style={{ margin: '0 0 4px 0', color: '#2563eb' }}><strong>File xuất:</strong> <b>{res.assigned_car}</b></p>
                  <p style={{ margin: 0 }}><strong>Tình trạng:</strong> <span style={{ fontWeight: 'bold', color: res.status.includes('APP') ? '#166534' : '#991b1b' }}>{res.status}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
